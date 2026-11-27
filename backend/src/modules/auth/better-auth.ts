import * as bcrypt from 'bcrypt';
import { getAllowedOrigins } from '../../common/allowed-origins';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { takeCodeSend, takeCodeTry } from './email-code-limit';

/** Nest injection token for the Better Auth instance. */
export const BETTER_AUTH = 'BETTER_AUTH';

export const STAFF_ROLES = ['OWNER', 'MANAGER', 'KITCHEN', 'CASHIER'];

/** Private header main.ts sets from `req.ip`; Better Auth keys rate limits on it. */
export const CLIENT_IP_HEADER = 'x-br-client-ip';

/** Email-OTP endpoints that make a new code, and those that redeem one (capped per email). */
const CODE_SENDING_PATHS = new Set([
  '/email-otp/send-verification-otp',
  '/email-otp/request-password-reset',
  '/forget-password/email-otp',
]);
const CODE_CONSUMING_PATHS = new Set([
  '/sign-in/email-otp',
  '/email-otp/verify-email',
  '/email-otp/reset-password',
  '/email-otp/check-verification-otp',
]);

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
  const [{ betterAuth }, { prismaAdapter }, { bearer, emailOTP }, { createAuthMiddleware, APIError }] =
    await Promise.all([
      dynamicImport<typeof import('better-auth')>('better-auth'),
      dynamicImport<typeof import('better-auth/adapters/prisma')>('better-auth/adapters/prisma'),
      dynamicImport<typeof import('better-auth/plugins')>('better-auth/plugins'),
      dynamicImport<typeof import('better-auth/api')>('better-auth/api'),
    ]);

  const isStaffEmail = async (email: string): Promise<boolean> => {
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
        sendVerificationOTP: async ({ email, otp, type }, ctx) => {
          // A staff password is only changed in the admin (Team), never by an emailed code.
          if (type === 'forget-password' && (await isStaffEmail(email))) return;
          // Staff get codes too: they can sign in to the public sites, and to the admin with a
          // code instead of their password (POST /auth/login/code). Not awaited (signInCode
          // never rejects), so the response time does not depend on the email.
          // The code email carries the name of the site the customer is on (by request origin).
          const origin = ctx?.request?.headers.get('origin') ?? ctx?.headers?.get('origin') ?? '';
          const bunTheory = (process.env.BUN_THEORY_URL?.trim() || 'http://localhost:3000').replace(/\/+$/, '');
          const brand = origin.replace(/\/+$/, '') === bunTheory ? 'bun-theory' : 'bakar-roast';
          void emailService.signInCode(email, otp, type, brand);
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
    hooks: {
      // Per-email caps on making and redeeming codes (see email-code-limit.ts). Hooks run for
      // the HTTP routes and for AuthService's server-side auth.api calls alike. The cap is the
      // same for every email, so hitting it says nothing about whether the email is staff.
      before: createAuthMiddleware(async (ctx) => {
        const sending = CODE_SENDING_PATHS.has(ctx.path);
        if (!sending && !CODE_CONSUMING_PATHS.has(ctx.path)) return;
        const email = (ctx.body as { email?: unknown } | undefined)?.email;
        if (typeof email !== 'string' || !email.trim()) return;
        if (!(sending ? takeCodeSend(email) : takeCodeTry(email))) {
          throw new APIError('TOO_MANY_REQUESTS', {
            message: 'Too many codes for this email. Wait an hour and try again.',
          });
        }
      }),
    },
    advanced: {
      // main.ts overwrites this header with Express `req.ip` (honours TRUST_PROXY); never trust
      // raw x-forwarded-for, which any client can spoof.
      ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
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
