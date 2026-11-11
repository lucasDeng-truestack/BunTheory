import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  Auth,
  BETTER_AUTH,
  getRequestSession,
  toRequestUser,
} from '../../modules/auth/better-auth';

/** Any signed-in user (customer or staff) with a verified email. */
@Injectable()
export class CustomerAuthGuard implements CanActivate {
  constructor(@Inject(BETTER_AUTH) private readonly auth: Auth) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const session = await getRequestSession(this.auth, req.headers);
    if (!session || session.user.emailVerified !== true) {
      throw new UnauthorizedException();
    }
    req.user = toRequestUser(session);
    return true;
  }
}
