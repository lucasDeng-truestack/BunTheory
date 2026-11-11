import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CateringBooking,
  CateringBookingStatus,
  Prisma,
} from '@prisma/client';
import { randomBytes, randomInt } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateCateringBookingDto } from './dto/create-catering-booking.dto';
import {
  AvailabilityQueryDto,
  ListCateringBookingsQueryDto,
} from './dto/catering-query.dto';
import {
  ApproveCateringBookingDto,
  BlockCateringDateDto,
  DeclineCateringBookingDto,
  UpdateCateringBookingDto,
} from './dto/catering-admin.dto';
import {
  addDays,
  addMonths,
  fromDateOnly,
  klToday,
  toDateOnly,
} from './catering.dates';
import {
  canCustomerCancel,
  toBookingAdmin,
  toBookingCreated,
  toBookingMine,
  toBookingPublic,
} from './catering.mappers';
import {
  CateringAvailability,
  CateringBlockedDate,
  CateringBookingAdmin,
  CateringBookingCreated,
  CateringBookingMine,
  CateringBookingPublic,
  CateringCalendarDay,
} from './catering.types';

const DAY_MS = 86_400_000;
const MAX_PENDING_PER_CUSTOMER = 2;
/** No 0/O/1/I so references read cleanly over the phone. */
const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const DATE_TAKEN = {
  code: 'DATE_TAKEN',
  message: 'That date was just taken. Please pick another.',
};

type Rules = {
  cateringMinNoticeDays: number;
  cateringBookingWindowMonths: number;
  cateringHoldExpiryDays: number;
  cateringCancelCutoffDays: number;
};

const DEFAULT_RULES: Rules = {
  cateringMinNoticeDays: 7,
  cateringBookingWindowMonths: 6,
  cateringHoldExpiryDays: 3,
  cateringCancelCutoffDays: 3,
};

function isPrismaError(
  e: unknown,
  code: string,
): e is Prisma.PrismaClientKnownRequestError {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === code;
}

function isCalendarStatus(
  s: CateringBookingStatus,
): s is 'PENDING' | 'APPROVED' | 'COMPLETED' {
  return s === 'PENDING' || s === 'APPROVED' || s === 'COMPLETED';
}

function newReference(): string {
  let s = 'BR-';
  for (let i = 0; i < 6; i++) s += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return s;
}

/** Digits only, keeping a leading + if present. */
function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return raw.trim().startsWith('+') ? `+${digits}` : digits;
}

@Injectable()
export class CateringService {
  private readonly logger = new Logger(CateringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  // ─── Rules / window ─────────────────────────────────────────────────────────

  private async rules(): Promise<Rules> {
    const row = await this.prisma.systemSettings.findFirst({
      orderBy: { id: 'asc' },
      select: {
        cateringMinNoticeDays: true,
        cateringBookingWindowMonths: true,
        cateringHoldExpiryDays: true,
        cateringCancelCutoffDays: true,
      },
    });
    return row ?? DEFAULT_RULES;
  }

  private window(rules: Rules) {
    const today = klToday();
    return {
      minDate: addDays(today, rules.cateringMinNoticeDays),
      maxDate: addMonths(today, rules.cateringBookingWindowMonths),
    };
  }

  // ─── Lazy hold expiry ───────────────────────────────────────────────────────

  /** Expires stale PENDING holds and frees their dates. Safe to run concurrently. */
  private async expireStale(): Promise<void> {
    const now = new Date();
    const stale = await this.prisma.cateringBooking.findMany({
      where: { status: 'PENDING', holdExpiresAt: { lt: now } },
      select: { id: true },
      orderBy: { holdExpiresAt: 'asc' },
      take: 50,
    });
    for (const { id } of stale) {
      try {
        const expired = await this.prisma.$transaction(async (tx) => {
          const res = await tx.cateringBooking.updateMany({
            where: { id, status: 'PENDING', holdExpiresAt: { lt: now } },
            data: { status: 'EXPIRED' },
          });
          if (res.count !== 1) return null; // someone else expired or decided it
          await tx.cateringDate.deleteMany({ where: { bookingId: id } });
          return tx.cateringBooking.findUniqueOrThrow({ where: { id } });
        });
        if (expired) void this.email.bookingExpired(expired);
      } catch (e) {
        // One bad row must not break the request that triggered the sweep.
        this.logger.error(`Failed to expire catering booking ${id}`, e as Error);
      }
    }
  }

  // ─── Public ─────────────────────────────────────────────────────────────────

  async availability(q: AvailabilityQueryDto): Promise<CateringAvailability> {
    if (q.from) toDateOnly(q.from);
    if (q.to) toDateOnly(q.to);
    await this.expireStale();
    const { minDate, maxDate } = this.window(await this.rules());
    // Clamp to the bookable window: dates outside it are never bookable anyway,
    // and it keeps the query bounded whatever the caller sends.
    const from = q.from && q.from > minDate ? q.from : minDate;
    const to = q.to && q.to < maxDate ? q.to : maxDate;
    const rows =
      from > to
        ? []
        : await this.prisma.cateringDate.findMany({
            where: { date: { gte: toDateOnly(from), lte: toDateOnly(to) } },
            select: { date: true },
            orderBy: { date: 'asc' },
            take: 1000, // window is at most 24 months by settings validation
          });
    return { minDate, maxDate, unavailable: rows.map((r) => fromDateOnly(r.date)) };
  }

  /** `userId` comes only from a verified session (OptionalAuthGuard), never from the body. */
  async createBooking(
    dto: CreateCateringBookingDto,
    userId: string | null = null,
  ): Promise<CateringBookingCreated> {
    if (typeof dto.website === 'string' && dto.website.trim() !== '') {
      throw new BadRequestException('Invalid request.');
    }
    await this.expireStale();

    const rules = await this.rules();
    const eventDate = toDateOnly(dto.eventDate);
    const { minDate, maxDate } = this.window(rules);
    if (dto.eventDate < minDate || dto.eventDate > maxDate) {
      throw new BadRequestException({
        code: 'DATE_OUT_OF_RANGE',
        message: `Please pick a date between ${minDate} and ${maxDate}.`,
      });
    }

    const pkg = await this.prisma.cateringPackage.findUnique({
      where: { id: dto.packageId },
    });
    if (!pkg || !pkg.isActive) {
      throw new BadRequestException({
        code: 'PACKAGE_UNAVAILABLE',
        message: 'That package is not available. Please pick another.',
      });
    }
    if (
      dto.guests < pkg.minGuests ||
      (pkg.maxGuests != null && dto.guests > pkg.maxGuests)
    ) {
      throw new BadRequestException({
        code: 'GUESTS_OUT_OF_RANGE',
        message:
          pkg.maxGuests != null
            ? `This package is for ${pkg.minGuests} to ${pkg.maxGuests} guests.`
            : `This package is for at least ${pkg.minGuests} guests.`,
      });
    }

    const customerEmail = dto.customerEmail.trim().toLowerCase();
    const customerPhone = normalisePhone(dto.customerPhone);
    // shortcut: soft cap, two simultaneous requests from one customer can both pass; the date PK is the hard guarantee.
    const pending = await this.prisma.cateringBooking.count({
      where: {
        status: 'PENDING',
        OR: [{ customerEmail }, { customerPhone }],
      },
    });
    if (pending >= MAX_PENDING_PER_CUSTOMER) {
      throw new ConflictException({
        code: 'TOO_MANY_PENDING',
        message:
          'You already have 2 requests waiting on us. We will call you about those first.',
      });
    }

    // Fast path only; the CateringDate primary key below is the real guarantee.
    const taken = await this.prisma.cateringDate.findUnique({
      where: { date: eventDate },
      select: { date: true },
    });
    if (taken) throw new ConflictException(DATE_TAKEN);

    // A hold never outlives its own event: cap it at the end of the event day in
    // Malaysia (00:00 UTC + 16h = midnight KL), so a same-day request is not expired at once.
    const holdExpiresAt = new Date(
      Math.min(
        Date.now() + rules.cateringHoldExpiryDays * DAY_MS,
        eventDate.getTime() + 16 * 3_600_000,
      ),
    );

    let booking: CateringBooking | null = null;
    for (let attempt = 0; attempt < 5 && !booking; attempt++) {
      try {
        // Default isolation on purpose: the date PK is the lock, Serializable
        // would turn the race loser into a P2034 instead of a clean P2002.
        booking = await this.prisma.$transaction(async (tx) => {
          const created = await tx.cateringBooking.create({
            data: {
              reference: newReference(),
              accessToken: randomBytes(24).toString('base64url'),
              status: 'PENDING',
              eventDate,
              serviceTime: dto.serviceTime,
              packageId: pkg.id,
              packageName: pkg.name,
              guests: dto.guests,
              occasion: dto.occasion,
              customerName: dto.customerName,
              customerPhone,
              customerEmail,
              eventAddress: dto.eventAddress,
              dietaryNotes: dto.dietaryNotes?.trim() || null,
              notes: dto.notes?.trim() || null,
              holdExpiresAt,
              userId,
            },
          });
          await tx.cateringDate.create({
            data: { date: eventDate, bookingId: created.id },
          });
          return created;
        });
      } catch (e) {
        if (!isPrismaError(e, 'P2002')) throw e;
        const target = e.meta?.target;
        const fields =Array.isArray(target) ? target.map(String) : [String(target)];
        // Reference / accessToken collision: retry with fresh identifiers.
        if (fields.some((f) => f.includes('reference') || f.includes('accessToken'))) {
          continue;
        }
        throw new ConflictException(DATE_TAKEN);
      }
    }
    if (!booking) {
      throw new ConflictException({
        code: 'TRY_AGAIN',
        message: 'Please try again in a moment.',
      });
    }

    // Not awaited: EmailService never rejects, and a slow provider must not
    // delay a response for a booking that is already committed.
    void this.email.bookingReceived(booking);
    void this.email.ownerNewRequest(booking);
    return toBookingCreated(booking);
  }

  /** A signed-in customer's bookings: linked to their account or sent from their verified email. */
  async listMine(user: {
    id: string;
    email: string;
  }): Promise<CateringBookingMine[]> {
    await this.expireStale();
    const [rows, rules] = await Promise.all([
      this.prisma.cateringBooking.findMany({
        where: {
          OR: [
            { userId: user.id },
            { customerEmail: user.email.trim().toLowerCase() },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.rules(),
    ]);
    return rows.map((b) => toBookingMine(b, rules.cateringCancelCutoffDays));
  }

  private async findByToken(accessToken: string): Promise<CateringBooking> {
    const booking = await this.prisma.cateringBooking.findUnique({
      where: { accessToken },
    });
    if (!booking) throw new NotFoundException('Booking not found.');
    return booking;
  }

  async getPublicBooking(accessToken: string): Promise<CateringBookingPublic> {
    await this.expireStale();
    const [booking, rules] = await Promise.all([
      this.findByToken(accessToken),
      this.rules(),
    ]);
    return toBookingPublic(booking, rules.cateringCancelCutoffDays);
  }

  async customerCancel(accessToken: string): Promise<CateringBookingPublic> {
    const [booking, rules] = await Promise.all([
      this.findByToken(accessToken),
      this.rules(),
    ]);
    const cutoff = rules.cateringCancelCutoffDays;
    if (booking.status !== 'PENDING' && booking.status !== 'APPROVED') {
      throw this.invalidState(booking.status, 'CANCELLED');
    }
    if (!canCustomerCancel(booking, cutoff)) {
      throw new ConflictException({
        code: 'CANCEL_WINDOW_CLOSED',
        message: 'The cancellation deadline has passed. Please contact us.',
      });
    }
    const cancelled = await this.transition(
      booking.id,
      ['PENDING', 'APPROVED'],
      { status: 'CANCELLED', cancelledAt: new Date() },
      true,
    );
    void this.email.bookingCancelled(cancelled);
    void this.email.ownerCustomerCancelled(cancelled);
    return toBookingPublic(cancelled, cutoff);
  }

  // ─── Admin: bookings ────────────────────────────────────────────────────────

  async list(q: ListCateringBookingsQueryDto): Promise<CateringBookingAdmin[]> {
    await this.expireStale();
    const eventDate: Prisma.DateTimeFilter = {};
    if (q.from) eventDate.gte = toDateOnly(q.from);
    if (q.to) eventDate.lte = toDateOnly(q.to);
    const upcoming = q.status === 'PENDING' || q.status === 'APPROVED';
    const rows = await this.prisma.cateringBooking.findMany({
      where: {
        ...(q.status ? { status: q.status } : {}),
        ...(q.from || q.to ? { eventDate } : {}),
      },
      orderBy: upcoming ? { eventDate: 'asc' } : { createdAt: 'desc' },
      take: q.take ?? 100,
    });
    return rows.map(toBookingAdmin);
  }

  async pendingCount(): Promise<{ count: number }> {
    await this.expireStale();
    const count = await this.prisma.cateringBooking.count({
      where: { status: 'PENDING' },
    });
    return { count };
  }

  private async findById(id: string): Promise<CateringBooking> {
    const booking = await this.prisma.cateringBooking.findUnique({
      where: { id },
    });
    if (!booking) throw new NotFoundException('Booking not found.');
    return booking;
  }

  async getAdmin(id: string): Promise<CateringBookingAdmin> {
    return toBookingAdmin(await this.findById(id));
  }

  private invalidState(from: CateringBookingStatus, to: CateringBookingStatus) {
    return new ConflictException({
      code: 'INVALID_STATE',
      message: `This booking is ${from.toLowerCase()} and cannot be changed to ${to.toLowerCase()}.`,
    });
  }

  /**
   * Conditional state change: only applies while the booking is still in one of
   * `from`, so concurrent approve/cancel/expire cannot both win. Frees the date
   * in the same transaction when `freeDate` is set.
   */
  private async transition(
    id: string,
    from: CateringBookingStatus[],
    data: Prisma.CateringBookingUpdateManyMutationInput & {
      status: CateringBookingStatus;
    },
    freeDate: boolean,
  ): Promise<CateringBooking> {
    const current = await this.findById(id);
    return this.prisma.$transaction(async (tx) => {
      const res = await tx.cateringBooking.updateMany({
        where: { id, status: { in: from } },
        data,
      });
      if (res.count !== 1) {
        const now = await tx.cateringBooking.findUnique({
          where: { id },
          select: { status: true },
        });
        throw this.invalidState(now?.status ?? current.status, data.status);
      }
      if (freeDate) {
        await tx.cateringDate.deleteMany({ where: { bookingId: id } });
      }
      return tx.cateringBooking.findUniqueOrThrow({ where: { id } });
    });
  }

  async approve(
    id: string,
    dto: ApproveCateringBookingDto,
  ): Promise<CateringBookingAdmin> {
    const booking = await this.transition(
      id,
      ['PENDING'],
      {
        status: 'APPROVED',
        holdExpiresAt: null,
        decidedAt: new Date(),
        // != null: IsOptional lets an explicit null through; treat it as "not given".
        ...(dto.quoteAmount != null
          ? { quoteAmount: new Prisma.Decimal(dto.quoteAmount) }
          : {}),
        ...(dto.depositAmount != null
          ? { depositAmount: new Prisma.Decimal(dto.depositAmount) }
          : {}),
        ...(dto.adminNotes !== undefined
          ? { adminNotes: dto.adminNotes?.trim() || null }
          : {}),
      },
      false,
    );
    void this.email.bookingApproved(booking);
    return toBookingAdmin(booking);
  }

  async decline(
    id: string,
    dto: DeclineCateringBookingDto,
  ): Promise<CateringBookingAdmin> {
    const booking = await this.transition(
      id,
      ['PENDING'],
      {
        status: 'DECLINED',
        decidedAt: new Date(),
        declineReason: dto.reason?.trim() || null,
      },
      true,
    );
    void this.email.bookingDeclined(booking);
    return toBookingAdmin(booking);
  }

  async adminCancel(id: string): Promise<CateringBookingAdmin> {
    const booking = await this.transition(
      id,
      ['PENDING', 'APPROVED'],
      { status: 'CANCELLED', cancelledAt: new Date() },
      true,
    );
    void this.email.bookingCancelled(booking);
    return toBookingAdmin(booking);
  }

  async complete(id: string): Promise<CateringBookingAdmin> {
    // COMPLETED is terminal and keeps the date held, so a mis-click before the
    // event would lock that date for good.
    const current = await this.findById(id);
    if (fromDateOnly(current.eventDate) > klToday()) {
      throw new ConflictException({
        code: 'EVENT_NOT_YET',
        message: 'You can mark a booking completed on or after its event date.',
      });
    }
    const booking = await this.transition(
      id,
      ['APPROVED'],
      { status: 'COMPLETED' },
      false,
    );
    return toBookingAdmin(booking);
  }

  async update(
    id: string,
    dto: UpdateCateringBookingDto,
  ): Promise<CateringBookingAdmin> {
    const current = await this.findById(id);
    const data: Prisma.CateringBookingUpdateInput = {};
    // null clears, undefined leaves untouched.
    if (dto.quoteAmount !== undefined) {
      data.quoteAmount =
        dto.quoteAmount === null ? null : new Prisma.Decimal(dto.quoteAmount);
    }
    if (dto.depositAmount !== undefined) {
      data.depositAmount =
        dto.depositAmount === null ? null : new Prisma.Decimal(dto.depositAmount);
    }
    if (dto.depositPaid === true && !current.depositPaidAt) {
      data.depositPaidAt = new Date();
    } else if (dto.depositPaid === false) {
      data.depositPaidAt = null;
    }
    if (dto.balancePaid === true && !current.balancePaidAt) {
      data.balancePaidAt = new Date();
    } else if (dto.balancePaid === false) {
      data.balancePaidAt = null;
    }
    if (dto.adminNotes !== undefined) {
      data.adminNotes = dto.adminNotes?.trim() || null;
    }
    const updated = await this.prisma.cateringBooking.update({
      where: { id },
      data,
    });
    return toBookingAdmin(updated);
  }

  // ─── Admin: calendar and blocked dates ─────────────────────────────────────

  async calendar(q: AvailabilityQueryDto): Promise<CateringCalendarDay[]> {
    if (!q.from || !q.to) {
      throw new BadRequestException('from and to are required (YYYY-MM-DD).');
    }
    const from = toDateOnly(q.from);
    const to = toDateOnly(q.to);
    if (q.from > q.to || q.to > addMonths(q.from, 12)) {
      throw new BadRequestException(
        'The range must run forwards and span at most 12 months.',
      );
    }
    await this.expireStale();
    // Bounded by the 12-month span check above (at most 366 rows).
    const rows = await this.prisma.cateringDate.findMany({
      where: { date: { gte: from, lte: to } },
      include: {
        booking: { select: { id: true, reference: true, status: true } },
      },
      orderBy: { date: 'asc' },
    });
    // A booking keeps its date row while PENDING, APPROVED or COMPLETED; decline,
    // cancel and expire delete it. Any other status would be a data bug: log, skip.
    return rows.flatMap((r): CateringCalendarDay[] => {
      const b = r.booking;
      const kind = !b ? 'BLOCKED' : isCalendarStatus(b.status) ? b.status : null;
      if (kind === null) {
        this.logger.warn(`Date ${fromDateOnly(r.date)} held by ${b?.status} booking ${b?.id}`);
        return [];
      }
      return [
        {
          date: fromDateOnly(r.date),
          kind,
          bookingId: b?.id ?? null,
          reference: b?.reference ?? null,
          reason: b ? null : r.blockReason,
        },
      ];
    });
  }

  async listBlocked(): Promise<CateringBlockedDate[]> {
    const rows = await this.prisma.cateringDate.findMany({
      where: { bookingId: null, date: { gte: toDateOnly(klToday()) } },
      orderBy: { date: 'asc' },
      take: 400,
    });
    return rows.map((r) => ({ date: fromDateOnly(r.date), reason: r.blockReason }));
  }

  async block(dto: BlockCateringDateDto): Promise<CateringBlockedDate> {
    const date = toDateOnly(dto.date);
    if (dto.date < klToday()) {
      throw new BadRequestException('You cannot block a date in the past.');
    }
    try {
      const row = await this.prisma.cateringDate.create({
        data: { date, blockReason: dto.reason?.trim() || null },
      });
      return { date: fromDateOnly(row.date), reason: row.blockReason };
    } catch (e) {
      if (isPrismaError(e, 'P2002')) {
        throw new ConflictException({
          code: 'DATE_TAKEN',
          message: 'That date is already blocked or booked.',
        });
      }
      throw e;
    }
  }

  async unblock(dateParam: string): Promise<{ date: string }> {
    const date = toDateOnly(dateParam);
    // bookingId: null so this can never free a booking's hold.
    const res = await this.prisma.cateringDate.deleteMany({
      where: { date, bookingId: null },
    });
    if (res.count === 0) throw new NotFoundException('No blocked date found.');
    return { date: dateParam };
  }
}
