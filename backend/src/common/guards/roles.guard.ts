import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Light RBAC: allow the route when the authenticated admin's role is in the
 * `@Roles(...)` list. Must run after `JwtAuthGuard` (which sets `req.user`).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AdminRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const role: AdminRole | undefined = request.user?.role;
    if (role && required.includes(role)) return true;

    throw new ForbiddenException(
      'You do not have permission to perform this action.',
    );
  }
}
