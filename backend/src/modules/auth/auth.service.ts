import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminPasswordDto } from './dto/update-admin-password.dto';
import { UpdateAdminDisplayNameDto } from './dto/update-admin-display-name.dto';
import { Auth, BETTER_AUTH, STAFF_ROLES } from './better-auth';

/** The authenticated staff member making the request (`req.user` from AdminAuthGuard). */
export type StaffCaller = { id: string; role: string; sessionId: string };

const ADMIN_SELECT = {
  id: true,
  email: true,
  displayName: true,
  createdAt: true,
} as const;

/** `User.displayName` is required; the old Admin column was nullable and clients expect null for "unset". */
function withNullableName<T extends { displayName: string }>(row: T) {
  return { ...row, displayName: row.displayName || null };
}

/** Better Auth (better-call) APIError carries a numeric HTTP status; 4xx means bad credentials or unverified. */
function isAuthClientError(err: unknown): boolean {
  const e = err as { name?: unknown; statusCode?: unknown } | null;
  return (
    e?.name === 'APIError' &&
    typeof e.statusCode === 'number' &&
    e.statusCode >= 400 &&
    e.statusCode < 500
  );
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    @Inject(BETTER_AUTH) private readonly auth: Auth,
  ) {}

  async login(dto: LoginDto) {
    let result: Awaited<ReturnType<typeof this.signIn>>;
    try {
      result = await this.signIn(dto.email.trim().toLowerCase(), dto.password);
    } catch (err) {
      if (isAuthClientError(err)) {
        throw new UnauthorizedException('Invalid credentials');
      }
      throw err;
    }

    const { headers, response } = result;
    const user = response.user;
    if (!STAFF_ROLES.includes(user.role)) {
      // A customer's password is right but /auth/login is staff only: kill the session we just made.
      await this.prisma.session.deleteMany({ where: { token: response.token } });
      throw new UnauthorizedException('Invalid credentials');
    }

    // The bearer plugin's signed token, the same value a browser client gets in `set-auth-token`.
    const accessToken = headers.get('set-auth-token') ?? response.token;

    return {
      accessToken,
      admin: {
        id: user.id,
        email: user.email,
        displayName: user.name || null,
        role: user.role,
      },
    };
  }

  private signIn(email: string, password: string) {
    return this.auth.api.signInEmail({
      body: { email, password },
      returnHeaders: true,
    });
  }

  async listAdmins() {
    const rows = await this.prisma.user.findMany({
      where: { role: { in: STAFF_ROLES } },
      orderBy: [{ createdAt: 'asc' }, { email: 'asc' }],
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        createdAt: true,
      },
    });
    return rows.map(withNullableName);
  }

  async createAdmin(dto: CreateAdminDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true },
    });

    if (existing && existing.role !== 'CUSTOMER') {
      throw new ConflictException('An admin with this email already exists');
    }

    const ctx = await this.auth.$context;
    const password = await bcrypt.hash(dto.password, 10);
    const displayName = dto.displayName?.trim();

    if (existing) {
      // Anyone can sign up as a customer with a future staff email; promote that account
      // instead of blocking the email forever. Its catering bookings stay linked.
      const accountId = ctx.generateId({ model: 'account' }) as string;
      const promoted = await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: existing.id },
          data: {
            // The DTO has no role; the old Admin model defaulted every new admin to OWNER.
            role: 'OWNER',
            emailVerified: true,
            ...(displayName !== undefined ? { displayName } : {}),
          },
        });
        await this.setCredentialPassword(tx, existing.id, password, accountId);
        // Sessions opened as a customer must not carry over into a staff account.
        await tx.session.deleteMany({ where: { userId: existing.id } });
        return tx.user.findUniqueOrThrow({
          where: { id: existing.id },
          select: ADMIN_SELECT,
        });
      });
      return withNullableName(promoted);
    }

    const id = ctx.generateId({ model: 'user' }) as string;
    const created = await this.prisma.user.create({
      data: {
        id,
        email,
        displayName: displayName ?? '',
        emailVerified: true,
        // The DTO has no role; the old Admin model defaulted every new admin to OWNER.
        role: 'OWNER',
        accounts: {
          create: {
            id: ctx.generateId({ model: 'account' }) as string,
            accountId: id,
            providerId: 'credential',
            password,
          },
        },
      },
      select: ADMIN_SELECT,
    });
    return withNullableName(created);
  }

  /** Write the bcrypt hash to the user's credential Account, creating the row if missing. */
  private async setCredentialPassword(
    tx: Prisma.TransactionClient,
    userId: string,
    hash: string,
    newAccountId: string,
  ) {
    const { count } = await tx.account.updateMany({
      where: { userId, providerId: 'credential' },
      data: { password: hash },
    });
    if (count === 0) {
      await tx.account.create({
        data: {
          id: newAccountId,
          accountId: userId,
          providerId: 'credential',
          userId,
          password: hash,
        },
      });
    }
  }

  /**
   * 404 unless the target is staff; 403 unless the caller may manage it:
   * themselves, an OWNER (anyone), or a MANAGER (anyone but an OWNER).
   */
  private async assertCanManage(caller: StaffCaller, targetId: string) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { role: true },
    });
    if (!target || !STAFF_ROLES.includes(target.role)) {
      throw new NotFoundException('Admin not found');
    }
    const allowed =
      caller.id === targetId ||
      caller.role === 'OWNER' ||
      (caller.role === 'MANAGER' && target.role !== 'OWNER');
    if (!allowed) {
      throw new ForbiddenException(
        'You do not have permission to perform this action.',
      );
    }
  }

  async updateAdminDisplayName(
    caller: StaffCaller,
    adminId: string,
    dto: UpdateAdminDisplayNameDto,
  ) {
    if (dto.displayName === undefined) {
      throw new BadRequestException('displayName is required');
    }

    await this.assertCanManage(caller, adminId);

    const updated = await this.prisma.user.update({
      where: { id: adminId },
      data: { displayName: dto.displayName.trim() },
      select: ADMIN_SELECT,
    });
    return withNullableName(updated);
  }

  async updateAdminPassword(
    caller: StaffCaller,
    adminId: string,
    dto: UpdateAdminPasswordDto,
  ) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    await this.assertCanManage(caller, adminId);

    const hashed = await bcrypt.hash(dto.password, 10);
    const accountId = (await this.auth.$context).generateId({
      model: 'account',
    }) as string;
    const updated = await this.prisma.$transaction(async (tx) => {
      await this.setCredentialPassword(tx, adminId, hashed, accountId);
      // Old tokens must stop working once the password changes, except the caller's own
      // current session when they change their own password.
      await tx.session.deleteMany({
        where: {
          userId: adminId,
          ...(caller.id === adminId ? { id: { not: caller.sessionId } } : {}),
        },
      });
      return tx.user.findUniqueOrThrow({
        where: { id: adminId },
        select: ADMIN_SELECT,
      });
    });
    return withNullableName(updated);
  }
}
