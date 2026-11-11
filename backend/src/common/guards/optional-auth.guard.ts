import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  Auth,
  BETTER_AUTH,
  getRequestSession,
  toRequestUser,
} from '../../modules/auth/better-auth';

/** Never blocks. Sets `req.user` when there is a valid verified session, else leaves it undefined. */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  private readonly logger = new Logger(OptionalAuthGuard.name);

  constructor(@Inject(BETTER_AUTH) private readonly auth: Auth) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    try {
      const session = await getRequestSession(this.auth, req.headers);
      if (session && session.user.emailVerified === true) {
        req.user = toRequestUser(session);
      }
    } catch (err) {
      // A bad token or a lookup failure means "anonymous", never an error for the caller.
      this.logger.warn(
        `Session lookup failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    return true;
  }
}
