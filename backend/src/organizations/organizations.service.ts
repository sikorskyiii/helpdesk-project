import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { QueryOrganizationDto } from './dto/query-organization.dto';
import { paginate } from '@/common/dto/pagination.dto';
import { RoleName } from '@prisma/client';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateOrganizationDto) {
    const existing = await this.prisma.organization.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Organization slug already taken');

    const orgAdminRole = await this.prisma.role.findUnique({ where: { name: RoleName.ORG_ADMIN } });
    if (!orgAdminRole) throw new BadRequestException('Roles not seeded');

    const org = await this.prisma.organization.create({
      data: {
        ...dto,
        ownerId: userId,
        members: {
          create: {
            userId,
            roleId: orgAdminRole.id,
          },
        },
      },
      include: { owner: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'ORGANIZATION_CREATED',
        entityType: 'organization',
        entityId: org.id,
        newValues: { name: org.name, slug: org.slug },
        userId,
      },
    });

    return org;
  }

  // ─── Find All ─────────────────────────────────────────────────────────────

  async findAll(query: QueryOrganizationDto) {
    const { page = 1, limit = 20, search, isActive } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [orgs, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { id: true, firstName: true, lastName: true, email: true } },
          _count: { select: { members: true, tickets: true } },
        },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return paginate(orgs, total, page, limit);
  }

  // ─── Find My Organizations ────────────────────────────────────────────────

  async findMine(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId, isActive: true },
      include: {
        organization: {
          include: {
            owner: { select: { id: true, firstName: true, lastName: true } },
            _count: { select: { members: true, tickets: true } },
          },
        },
        role: { select: { id: true, name: true } },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return memberships.map((m) => ({
      ...m.organization,
      myRole: m.role,
    }));
  }

  // ─── Find One ─────────────────────────────────────────────────────────────

  async findOne(idOrSlug: string) {
    const org = await this.prisma.organization.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        _count: { select: { members: true, tickets: true } },
      },
    });

    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(id: string, userId: string, dto: UpdateOrganizationDto) {
    await this.assertMemberWithRole(id, userId, [RoleName.ORG_ADMIN, RoleName.SUPER_ADMIN]);

    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');

    const updated = await this.prisma.organization.update({
      where: { id },
      data: dto,
      include: { owner: { select: { id: true, firstName: true, lastName: true } } },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'ORGANIZATION_UPDATED',
        entityType: 'organization',
        entityId: id,
        oldValues: { name: org.name, description: org.description },
        newValues: dto as any,
        userId,
      },
    });

    return updated;
  }

  // ─── Members ──────────────────────────────────────────────────────────────

  async getMembers(orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');

    return this.prisma.organizationMember.findMany({
      where: { organizationId: orgId, isActive: true },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, isActive: true } },
        role: { select: { id: true, name: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async inviteMember(orgId: string, requesterId: string, dto: InviteMemberDto) {
    await this.assertMemberWithRole(orgId, requesterId, [RoleName.ORG_ADMIN, RoleName.SUPER_ADMIN]);

    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new NotFoundException(`User with email ${dto.email} not found`);

    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) throw new NotFoundException('Role not found');

    // Prevent inviting SUPER_ADMIN via org invite
    if (role.name === RoleName.SUPER_ADMIN) throw new ForbiddenException('Cannot assign SUPER_ADMIN via organization invite');

    const existing = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: user.id } },
    });

    if (existing) {
      if (existing.isActive) throw new ConflictException('User is already a member of this organization');
      // Re-activate
      return this.prisma.organizationMember.update({
        where: { id: existing.id },
        data: { isActive: true, roleId: dto.roleId },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          role: { select: { id: true, name: true } },
        },
      });
    }

    const member = await this.prisma.organizationMember.create({
      data: { organizationId: orgId, userId: user.id, roleId: dto.roleId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        role: { select: { id: true, name: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'MEMBER_INVITED',
        entityType: 'organization',
        entityId: orgId,
        newValues: { userId: user.id, role: role.name },
        userId: requesterId,
      },
    });

    // Notification for the invited user
    await this.prisma.notification.create({
      data: {
        type: 'MEMBER_INVITED',
        title: 'You were added to an organization',
        message: `You have been added to an organization as ${role.name.replace('_', ' ')}`,
        userId: user.id,
        metadata: { organizationId: orgId },
      },
    });

    return member;
  }

  async updateMemberRole(orgId: string, memberId: string, requesterId: string, dto: UpdateMemberRoleDto) {
    await this.assertMemberWithRole(orgId, requesterId, [RoleName.ORG_ADMIN, RoleName.SUPER_ADMIN]);

    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: orgId, isActive: true },
      include: { role: true },
    });
    if (!member) throw new NotFoundException('Member not found');

    const newRole = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!newRole) throw new NotFoundException('Role not found');
    if (newRole.name === RoleName.SUPER_ADMIN) throw new ForbiddenException('Cannot assign SUPER_ADMIN role');

    const updated = await this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { roleId: dto.roleId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        role: { select: { id: true, name: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'ROLE_CHANGED',
        entityType: 'organization_member',
        entityId: memberId,
        oldValues: { role: member.role.name },
        newValues: { role: newRole.name },
        userId: requesterId,
      },
    });

    return updated;
  }

  async removeMember(orgId: string, memberId: string, requesterId: string) {
    await this.assertMemberWithRole(orgId, requesterId, [RoleName.ORG_ADMIN, RoleName.SUPER_ADMIN]);

    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: orgId },
      include: { organization: true },
    });
    if (!member) throw new NotFoundException('Member not found');

    // Owner cannot be removed
    if (member.userId === member.organization.ownerId) {
      throw new ForbiddenException('Cannot remove the organization owner');
    }

    await this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { isActive: false },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'MEMBER_REMOVED',
        entityType: 'organization',
        entityId: orgId,
        newValues: { memberId },
        userId: requesterId,
      },
    });

    return { message: 'Member removed successfully' };
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  async getStats(orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');

    const [totalTickets, openTickets, resolvedTickets, totalMembers, byStatus, byPriority] =
      await Promise.all([
        this.prisma.ticket.count({ where: { organizationId: orgId } }),
        this.prisma.ticket.count({ where: { organizationId: orgId, status: 'OPEN' } }),
        this.prisma.ticket.count({ where: { organizationId: orgId, status: 'RESOLVED' } }),
        this.prisma.organizationMember.count({ where: { organizationId: orgId, isActive: true } }),
        this.prisma.ticket.groupBy({
          by: ['status'],
          where: { organizationId: orgId },
          _count: { status: true },
        }),
        this.prisma.ticket.groupBy({
          by: ['priority'],
          where: { organizationId: orgId },
          _count: { priority: true },
        }),
      ]);

    return {
      totalTickets,
      openTickets,
      resolvedTickets,
      totalMembers,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.status })),
      byPriority: byPriority.map((p) => ({ priority: p.priority, count: p._count.priority })),
    };
  }

  // ─── Roles ────────────────────────────────────────────────────────────────

  async getRoles() {
    return this.prisma.role.findMany({ orderBy: { name: 'asc' } });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  async assertMemberWithRole(orgId: string, userId: string, allowedRoles: RoleName[]) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        userId,
        isActive: true,
        role: { name: { in: allowedRoles } },
      },
    });

    // Super Admin always has access
    const superAdminMembership = await this.prisma.organizationMember.findFirst({
      where: { userId, isActive: true, role: { name: RoleName.SUPER_ADMIN } },
    });

    if (!membership && !superAdminMembership) {
      throw new ForbiddenException('Insufficient permissions for this organization');
    }
  }

  async assertIsMember(orgId: string, userId: string) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { organizationId: orgId, userId, isActive: true },
    });

    const superAdmin = await this.prisma.organizationMember.findFirst({
      where: { userId, isActive: true, role: { name: RoleName.SUPER_ADMIN } },
    });

    if (!membership && !superAdmin) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    return membership;
  }
}
