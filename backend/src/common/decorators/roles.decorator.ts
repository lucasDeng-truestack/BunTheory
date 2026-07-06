import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Restrict a route to the given admin roles (used with {@link RolesGuard}). */
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);
