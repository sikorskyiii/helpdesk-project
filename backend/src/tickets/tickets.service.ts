import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { QueryTicketDto } from './dto/query-ticket.dto';
import { paginate } from '@/common/dto/pagination.dto';
import { RoleName, TicketStatus } from '@prisma/client';

const TICKET_INCLUDE = {
  reporter: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
  assignee: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
  organization: { select: { id: true, name: true, slug: true } },
  _count: { select: { comments: true, attachments: true } },
};

const ALLOWED_SORT_FIELDS = ['createdAt', 'updatedAt', 'priority', 'status', 'title'];

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateTicketDto) {
    await this.assertOrgMember(dto.organizationId, userId);

    if (dto.assigneeId) {
      await this.assertOrgMember(dto.organizationId, dto.assigneeId);
    }

    const ticket = await this.prisma.ticket.create({
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority ?? 'MEDIUM',
        category: dto.category,
        organizationId: dto.organizationId,
        reporterId: userId,
        assigneeId: dto.assigneeId ?? null,
      },
      include: TICKET_INCLUDE,
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'TICKET_CREATED',
        entityType: 'ticket',
        entityId: ticket.id,
        newValues: { title: ticket.title, priority: ticket.priority },
        userId,
      },
    });

    if (dto.assigneeId && dto.assigneeId !== userId) {
      await this.createNotification({
        type: 'TICKET_ASSIGNED',
        title: 'Ticket assigned to you',
        message: `You have been assigned to: "${ticket.title}"`,
        userId: dto.assigneeId,
        ticketId: ticket.id,
        metadata: { assignedBy: userId },
      });
    }

    return ticket;
  }

  // ─── Find All ─────────────────────────────────────────────────────────────

  async findAll(userId: string, query: QueryTicketDto) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      priority,
      category,
      organizationId,
      assigneeId,
      reporterId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const orderField = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : 'createdAt';

    // Scope: user sees tickets from orgs they belong to
    const userOrgIds = await this.getUserOrgIds(userId);

    const where: any = {
      organizationId: { in: userOrgIds },
    };

    if (organizationId) where.organizationId = organizationId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (assigneeId) where.assigneeId = assigneeId;
    if (reporterId) where.reporterId = reporterId;

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderField]: sortOrder },
        include: TICKET_INCLUDE,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return paginate(tickets, total, page, limit);
  }

  // ─── Find One ─────────────────────────────────────────────────────────────

  async findOne(id: string, userId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        ...TICKET_INCLUDE,
        history: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            changedBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    await this.assertOrgMember(ticket.organizationId, userId);

    return ticket;
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(id: string, userId: string, dto: UpdateTicketDto) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    await this.assertCanModify(ticket, userId);

    if (dto.assigneeId) {
      await this.assertOrgMember(ticket.organizationId, dto.assigneeId);
    }

    // Track changed fields for history
    const changedFields: Array<{ field: string; old: string; new: string }> = [];

    const trackable: (keyof UpdateTicketDto)[] = ['title', 'description', 'priority', 'status', 'category', 'assigneeId'];
    for (const field of trackable) {
      const oldVal = (ticket as any)[field];
      const newVal = (dto as any)[field];
      if (newVal !== undefined && String(oldVal ?? '') !== String(newVal ?? '')) {
        changedFields.push({ field, old: String(oldVal ?? ''), new: String(newVal ?? '') });
      }
    }

    // Set timestamps on status transitions
    const data: any = { ...dto };
    if (dto.status === TicketStatus.RESOLVED && ticket.status !== TicketStatus.RESOLVED) {
      data.resolvedAt = new Date();
    }
    if (dto.status === TicketStatus.CLOSED && ticket.status !== TicketStatus.CLOSED) {
      data.closedAt = new Date();
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data,
      include: TICKET_INCLUDE,
    });

    // Persist history entries
    if (changedFields.length) {
      await this.prisma.ticketHistory.createMany({
        data: changedFields.map((c) => ({
          ticketId: id,
          changedById: userId,
          field: c.field,
          oldValue: c.old,
          newValue: c.new,
        })),
      });
    }

    await this.prisma.auditLog.create({
      data: {
        action: 'TICKET_UPDATED',
        entityType: 'ticket',
        entityId: id,
        oldValues: changedFields.reduce((a, c) => ({ ...a, [c.field]: c.old }), {}),
        newValues: changedFields.reduce((a, c) => ({ ...a, [c.field]: c.new }), {}),
        userId,
      },
    });

    // Notifications on key changes
    const prevAssigneeId = ticket.assigneeId;
    if (dto.assigneeId && dto.assigneeId !== prevAssigneeId && dto.assigneeId !== userId) {
      await this.createNotification({
        type: 'TICKET_ASSIGNED',
        title: 'Ticket assigned to you',
        message: `You have been assigned to: "${updated.title}"`,
        userId: dto.assigneeId,
        ticketId: id,
        metadata: { assignedBy: userId },
      });
    }

    if (dto.status && dto.status !== ticket.status) {
      const notifyUsers = new Set<string>([ticket.reporterId]);
      if (ticket.assigneeId) notifyUsers.add(ticket.assigneeId);
      notifyUsers.delete(userId);

      for (const notifyUserId of notifyUsers) {
        await this.createNotification({
          type: 'STATUS_CHANGED',
          title: 'Ticket status changed',
          message: `Ticket "${updated.title}" status changed to ${dto.status.replace('_', ' ')}`,
          userId: notifyUserId,
          ticketId: id,
          metadata: { oldStatus: ticket.status, newStatus: dto.status },
        });
      }
    }

    return updated;
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async remove(id: string, userId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    await this.assertCanDelete(ticket, userId);

    await this.prisma.ticket.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: {
        action: 'TICKET_DELETED',
        entityType: 'ticket',
        entityId: id,
        oldValues: { title: ticket.title },
        userId,
      },
    });

    return { message: 'Ticket deleted' };
  }

  // ─── History ──────────────────────────────────────────────────────────────

  async getHistory(ticketId: string, userId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    await this.assertOrgMember(ticket.organizationId, userId);

    return this.prisma.ticketHistory.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'desc' },
      include: {
        changedBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  }

  // ─── Assign ───────────────────────────────────────────────────────────────

  async assign(id: string, assigneeId: string | null, userId: string) {
    return this.update(id, userId, { assigneeId: assigneeId ?? undefined });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async getUserOrgIds(userId: string): Promise<string[]> {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId, isActive: true },
      select: { organizationId: true },
    });
    return memberships.map((m) => m.organizationId);
  }

  private async assertOrgMember(orgId: string, userId: string) {
    const superAdmin = await this.prisma.organizationMember.findFirst({
      where: { userId, isActive: true, role: { name: RoleName.SUPER_ADMIN } },
    });
    if (superAdmin) return;

    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId: orgId, userId, isActive: true },
    });
    if (!member) throw new ForbiddenException('You are not a member of this organization');
  }

  private async assertCanModify(ticket: any, userId: string) {
    const isReporter = ticket.reporterId === userId;
    const isAssignee = ticket.assigneeId === userId;

    const adminMembership = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: ticket.organizationId,
        userId,
        isActive: true,
        role: { name: { in: [RoleName.ORG_ADMIN, RoleName.SUPER_ADMIN, RoleName.AGENT] } },
      },
    });

    if (!isReporter && !isAssignee && !adminMembership) {
      throw new ForbiddenException('You do not have permission to modify this ticket');
    }
  }

  private async assertCanDelete(ticket: any, userId: string) {
    const adminMembership = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: ticket.organizationId,
        userId,
        isActive: true,
        role: { name: { in: [RoleName.ORG_ADMIN, RoleName.SUPER_ADMIN] } },
      },
    });

    if (ticket.reporterId !== userId && !adminMembership) {
      throw new ForbiddenException('You do not have permission to delete this ticket');
    }
  }

  private async createNotification(data: {
    type: string;
    title: string;
    message: string;
    userId: string;
    ticketId: string;
    metadata?: Record<string, any>;
  }) {
    await this.prisma.notification.create({ data: data as any });
  }
}
