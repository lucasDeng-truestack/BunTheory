import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import {
  Auth,
  BETTER_AUTH,
  STAFF_ROLES,
  getRequestSession,
  toRequestUser,
} from '../../modules/auth/better-auth';

/** Staff-only routes. A customer session is treated exactly like no session (401). */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(BETTER_AUTH) private readonly auth: Auth,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const session = await getRequestSession(this.auth, req.headers);
    if (!session || !STAFF_ROLES.includes(session.user.role)) {
      throw new UnauthorizedException();
    }
    req.user = toRequestUser(session);
    return true;
  }
}
