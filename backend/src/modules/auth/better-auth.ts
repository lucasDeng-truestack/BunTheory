import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { getAllowedOrigins } from '../../common/allowed-origins';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';

/** Nest injection token for the Better Auth instance. */
export const BETTER_AUTH = 'BETTER_AUTH';

export const STAFF_ROLES = ['OWNER', 'MANAGER', 'KITCHEN', 'CASHIER'];

/** Private header main.ts sets from `req.ip`; Better Auth keys rate limits on it. */
export const CLIENT_IP_HEADER = 'x-br-client-ip';

/** Email-OTP endpoints that redeem a code. Staff codes are made unredeemable here. */
const CODE_CONSUMING_PATHS = new Set([
  '/sign-in/email-otp',
  '/email-otp/verify-email',
  '/email-otp/reset-password',
  '/email-otp/check-verification-otp',
]);
/** Never equal to a generated code (those are digits only), so redemption fails as a wrong code. */
const UNMATCHABLE_OTP = 'staff-no-otp';

/**
 * better-auth is ESM-only and this app compiles to CommonJS. `new Function` keeps a real
 * `import()` that tsc will not rewrite into `require()`, so we do not depend on require(esm).
 */
export const dynamicImport = new Function('s', 'return import(s)') as <T>(
  s: string,
) => Promise<T>;

/** No fallback in any environment: a missing secret fails the boot. */
export function resolveSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error(
      'BETTER_AUTH_SECRET is not set. Generate one with `openssl rand -base64 32`.',
    );
  }
  return secret;
}

export async function createAuth(prisma: PrismaService, emailService: EmailService) {
  const logger = new Logger('BetterAuth');
  const [{ betterAuth }, { prismaAdapter }, { bearer, emailOTP }, { createAuthMiddleware }] =
    await Promise.all([
      dynamicImport<typeof import('better-auth')>('better-auth'),
      dynamicImport<typeof import('better-auth/adapters/prisma')>('better-auth/adapters/prisma'),
      dynamicImport<typeof import('better-auth/plugins')>('better-auth/plugins'),
      dynamicImport<typeof import('better-auth/api')>('better-auth/api'),
    ]);

  const isStaffEmail = async (email: unknown): Promise<boolean> => {
    if (typeof email !== 'string' || !email.trim()) return false;
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { role: true },
    });
    return !!user && user.role !== 'CUSTOMER';
  };

  return betterAuth({
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    basePath: '/api/auth',
    baseURL:
      process.env.BETTER_AUTH_URL?.trim() ||
      `http://localhost:${process.env.PORT || 3101}`,
    secret: resolveSecret(),
    trustedOrigins: getAllowedOrigins(),
    user: {
      fields: { name: 'displayName' },
      additionalFields: {
        role: { type: 'string', defaultValue: 'CUSTOMER', input: false },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      // Same bcrypt cost as the old AuthService so migrated staff hashes keep verifying.
      password: {
        hash: (password) => bcrypt.hash(password, 10),
        verify: ({ hash, password }) => bcrypt.compare(password, hash),
      },
    },
    plugins: [
      bearer(),
      emailOTP({
        otpLength: 6,
        expiresIn: 300,
        overrideDefaultEmailVerification: true,
        sendVerificationOnSignUp: true,
        sendVerificationOTP: async ({ email, otp, type }) => {
          // Staff never receive a code; the endpoint still answers as for any email.
          if (await isStaffEmail(email)) {
            logger.warn(`Refused to send a ${type} code to a staff account`);
            return;
          }
          // Not awaited (signInCode never rejects): response time must not differ for staff.
          void emailService.signInCode(email, otp, type);
        },
      }),
    ],
    rateLimit: {
      enabled: true,
      customRules: {
        '/email-otp/send-verification-otp': { window: 60, max: 3 },
        '/sign-in/email-otp': { window: 60, max: 5 },
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 5 },
      },
    },
    advanced: {
      // main.ts overwrites this header with Express `req.ip` (honours TRUST_PROXY); never trust
      // raw x-forwarded-for, which any client can spoof.
      ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
    },
    hooks: {
      // STAFF RULE: staff sign in with their password only, never with an emailed code.
      // Send paths run normally (sendVerificationOTP sends nothing to staff). On redeem paths a
      // staff email gets an unmatchable code, so it fails exactly like a wrong code would
      // (same status, body and attempt counting) and staff stay indistinguishable from customers.
      before: createAuthMiddleware(async (ctx) => {
        if (!CODE_CONSUMING_PATHS.has(ctx.path)) return;
        const body = ctx.body as Record<string, unknown> | undefined;
        if (!body || !(await isStaffEmail(body.email))) return;
        return { context: { body: { ...body, otp: UNMATCHABLE_OTP } } };
      }),
    },
  });
}

export type Auth = Awaited<ReturnType<typeof createAuth>>;
export type AuthSession = NonNullable<Awaited<ReturnType<Auth['api']['getSession']>>>;

/**
 * Resolve the Better Auth session for an incoming Node request (cookie or `Authorization: Bearer`).
 * Headers are converted the same way as `fromNodeHeaders` in better-auth/node.
 */
export function getRequestSession(
  auth: Auth,
  nodeHeaders: Record<string, string | string[] | undefined>,
): Promise<AuthSession | null> {
  const headers = new Headers();
  for (const [key, value] of Object.entries(nodeHeaders)) {
    if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
    else if (value !== undefined) headers.set(key, value);
  }
  return auth.api.getSession({ headers });
}

/** The `req.user` every guard sets. `sessionId` lets a self password change keep the caller's session. */
export function toRequestUser(session: AuthSession): NonNullable<Express.Request['user']> {
  const { user } = session;
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    displayName: user.name,
    emailVerified: user.emailVerified,
    sessionId: session.session.id,
  };
}
