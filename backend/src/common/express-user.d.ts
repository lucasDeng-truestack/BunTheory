// Types `req.user` as set by AdminAuthGuard / CustomerAuthGuard / OptionalAuthGuard (toRequestUser).
// (It was previously declared by the removed JWT auth packages' typings.)
declare namespace Express {
  interface Request {
    user?: {
      id: string;
      email: string;
      role: string;
      displayName: string;
      emailVerified: boolean;
      sessionId: string;
    };
  }
}
