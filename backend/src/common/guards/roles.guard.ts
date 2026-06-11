import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '@prisma/client';
import { ROLES_KEY } from '@/common/decorators/roles.decorator';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return false;

    // Check if user has any of the required roles across any organization
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        userId: user.id,
        isActive: true,
        role: { name: { in: requiredRoles } },
      },
      include: { role: true },
    });

    if (!membership) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Attach role info to request for use in controllers/services
    request.userRole = membership.role.name;
    return true;
  }
}
