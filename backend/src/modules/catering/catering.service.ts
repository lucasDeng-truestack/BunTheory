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
  type BookingRow,
} from './catering.mappers';
import {
  CateringAvailability,
  CateringBlockedDate,
  CateringBookingAdmin,
  CateringBookingCreated,
  CateringBookingMine,
  CateringBookingPublic,
  CateringCalendarDay,
  CateringPaymentDetails,
} from './catering.types';

const DAY_MS = 86_400_000;
const MAX_PENDING_PER_CUSTOMER = 2;
/** No 0/O/1/I so references read cleanly over the phone. */
const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const DATE_TAKEN = {
  code: 'DATE_TAKEN',
  message: 'That date is fully booked. Please pick another.',
};
/** Statuses that use up one of a day's sets. */
const ACTIVE: CateringBookingStatus[] = ['PENDING', 'APPROVED', 'COMPLETED'];
/** Receipts a customer can upload to one booking. */
const MAX_RECEIPTS = 5;

type Rules = {
  cateringMinNoticeDays: number;
  cateringBookingWindowMonths: number;
  cateringHoldExpiryDays: number;
  cateringCancelCutoffDays: number;
  cateringDailySets: number;
};

const DEFAULT_RULES: Rules = {
  cateringMinNoticeDays: 7,
  cateringBookingWindowMonths: 6,
  cateringHoldExpiryDays: 3,
  cateringCancelCutoffDays: 3,
  cateringDailySets: 5,
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
        cateringDailySets: true,
      },
    });
    return row ?? DEFAULT_RULES;
  }

  /** Bank details and QR for the customer's booking page. */
  private async paymentDetails(): Promise<CateringPaymentDetails> {
    const row = await this.prisma.systemSettings.findFirst({
      orderBy: { id: 'asc' },
      select: {
        cateringBankName: true,
        cateringBankAccountName: true,
        cateringBankAccountNumber: true,
        cateringPaymentQrUrl: true,
      },
    });
    return {
      bankName: row?.cateringBankName ?? null,
      accountName: row?.cateringBankAccountName ?? null,
      accountNumber: row?.cateringBankAccountNumber ?? null,
      qrUrl: row?.cateringPaymentQrUrl ?? null,
    };
  }

  /** Active bookings per date in [from, to], as YYYY-MM-DD -> count. */
  private async activeCounts(from: Date, to: Date): Promise<Map<string, number>> {
    const groups = await this.prisma.cateringBooking.groupBy({
      by: ['eventDate'],
      where: { eventDate: { gte: from, lte: to }, status: { in: ACTIVE } },
      _count: { _all: true },
    });
    return new Map(groups.map((g) => [fromDateOnly(g.eventDate), g._count._all]));
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
      // A booking with a receipt waits for the owner: the customer already paid.
      where: { status: 'PENDING', holdExpiresAt: { lt: now }, receipts: { none: {} } },
      select: { id: true },
      orderBy: { holdExpiresAt: 'asc' },
      take: 50,
    });
    for (const { id } of stale) {
      try {
        const expired = await this.prisma.$transaction(async (tx) => {
          const res = await tx.cateringBooking.updateMany({
            where: { id, status: 'PENDING', holdExpiresAt: { lt: now }, receipts: { none: {} } },
            data: { status: 'EXPIRED' },
          });
          if (res.count !== 1) return null; // someone else expired or decided it
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
    if (from > to) return { minDate, maxDate, unavailable: [], fewLeft: {} };
    const fromD = toDateOnly(from);
    const toD = toDateOnly(to);
    const [rules, days, counts] = await Promise.all([
      this.rules(),
      // The window is at most 24 months by settings validation, so this stays bounded.
      this.prisma.cateringDay.findMany({
        where: { date: { gte: fromD, lte: toD } },
        take: 1000,
      }),
      this.activeCounts(fromD, toD),
    ]);
    const dayMap = new Map(days.map((d) => [fromDateOnly(d.date), d]));
    const dates = new Set([...dayMap.keys(), ...counts.keys()]);
    const unavailable: string[] = [];
    const fewLeft: Record<string, number> = {};
    for (const date of [...dates].sort()) {
      const day = dayMap.get(date);
      const cap = day?.capacity ?? rules.cateringDailySets;
      const left = cap - (counts.get(date) ?? 0);
      if (day?.closed || left <= 0) unavailable.push(date);
      else if (left <= 3) fewLeft[date] = left;
    }
    return { minDate, maxDate, unavailable, fewLeft };
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

    // Fixed price: total = price per set, or per pax x guests. No price = quoted later.
    const paymentChoice = dto.paymentChoice ?? 'DEPOSIT';
    const total =
      pkg.price != null
        ? pkg.priceUnit === 'PER_PAX'
          ? pkg.price.mul(dto.guests)
          : pkg.price
        : null;
    const due = total == null ? null : dueFor(total, paymentChoice);

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
        booking = await this.prisma.$transaction(async (tx) => {
          // The day row is the lock: make sure it exists, then hold it while counting, so
          // two customers cannot both take the last set.
          await tx.$executeRaw`INSERT INTO "CateringDay" ("date", "closed", "updatedAt") VALUES (${dto.eventDate}::date, false, now()) ON CONFLICT ("date") DO NOTHING`;
          const [day] = await tx.$queryRaw<
            { closed: boolean; capacity: number | null }[]
          >`SELECT "closed", "capacity" FROM "CateringDay" WHERE "date" = ${dto.eventDate}::date FOR UPDATE`;
          const capacity = day?.capacity ?? rules.cateringDailySets;
          const booked = await tx.cateringBooking.count({
            where: { eventDate, status: { in: ACTIVE } },
          });
          if (day?.closed || booked >= capacity) {
            throw new ConflictException(DATE_TAKEN);
          }
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
              occasion: dto.occasion?.trim() || null,
              quoteAmount: total,
              depositAmount: due,
              paymentChoice,
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
        throw e;
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
        include: { receipts: true },
      }),
      this.rules(),
    ]);
    const payment = await this.paymentDetails();
    return rows.map((b) =>
      toBookingMine(b, rules.cateringCancelCutoffDays, payment),
    );
  }

  private async findByToken(accessToken: string): Promise<BookingRow> {
    const booking = await this.prisma.cateringBooking.findUnique({
      where: { accessToken },
      include: { receipts: true },
    });
    if (!booking) throw new NotFoundException('Booking not found.');
    return booking;
  }

  async getPublicBooking(accessToken: string): Promise<CateringBookingPublic> {
    await this.expireStale();
    const [booking, rules, payment] = await Promise.all([
      this.findByToken(accessToken),
      this.rules(),
      this.paymentDetails(),
    ]);
    return toBookingPublic(booking, rules.cateringCancelCutoffDays, payment);
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
    );
    void this.email.bookingCancelled(cancelled);
    void this.email.ownerCustomerCancelled(cancelled);
    return toBookingPublic(cancelled, cutoff, await this.paymentDetails());
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

  private async findById(id: string): Promise<BookingRow> {
    const booking = await this.prisma.cateringBooking.findUnique({
      where: { id },
      include: { receipts: true },
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
   * `from`, so concurrent approve/cancel/expire cannot both win. A day's sets are
   * counted from booking status, so leaving PENDING/APPROVED frees the set.
   */
  private async transition(
    id: string,
    from: CateringBookingStatus[],
    data: Prisma.CateringBookingUpdateManyMutationInput & {
      status: CateringBookingStatus;
    },
  ): Promise<BookingRow> {
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
      return tx.cateringBooking.findUniqueOrThrow({
        where: { id },
        include: { receipts: true },
      });
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
        // Approving after checking a receipt confirms the first payment.
        ...(dto.markPaid ? paidOnApprove(await this.findById(id)) : {}),
        // != null: IsOptional lets an explicit null through; treat it as "not given".
        ...(dto.quoteAmount != null
          ? { quoteAmount: new Prisma.Decimal(dto.quoteAmount) }
          : {}),
        ...(dto.depositAmount != null
          ? { depositAmount: new Prisma.Decimal(dto.depositAmount) }
          : dto.quoteAmount != null
            ? {
                depositAmount: dueFor(
                  new Prisma.Decimal(dto.quoteAmount),
                  (await this.findById(id)).paymentChoice,
                ),
              }
            : {}),
        ...(dto.adminNotes !== undefined
          ? { adminNotes: dto.adminNotes?.trim() || null }
          : {}),
      },
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
    );
    void this.email.bookingDeclined(booking);
    return toBookingAdmin(booking);
  }

  async adminCancel(id: string): Promise<CateringBookingAdmin> {
    const booking = await this.transition(
      id,
      ['PENDING', 'APPROVED'],
      { status: 'CANCELLED', cancelledAt: new Date() },
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
    } else if (dto.quoteAmount != null) {
      // A new total without a new amount due: keep half or full as the customer chose.
      data.depositAmount = dueFor(new Prisma.Decimal(dto.quoteAmount), current.paymentChoice);
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
    // Bounded by the 12-month span check above.
    const [rules, days, bookings] = await Promise.all([
      this.rules(),
      this.prisma.cateringDay.findMany({ where: { date: { gte: from, lte: to } } }),
      this.prisma.cateringBooking.findMany({
        where: { eventDate: { gte: from, lte: to }, status: { in: ACTIVE } },
        select: {
          id: true,
          reference: true,
          status: true,
          eventDate: true,
          customerName: true,
          serviceTime: true,
        },
        orderBy: [{ eventDate: 'asc' }, { serviceTime: 'asc' }],
        take: 5000,
      }),
    ]);
    const out = new Map<string, CateringCalendarDay>();
    const dayOf = (date: string): CateringCalendarDay => {
      let d = out.get(date);
      if (!d) {
        d = {
          date,
          closed: false,
          reason: null,
          capacity: rules.cateringDailySets,
          customCapacity: false,
          bookings: [],
        };
        out.set(date, d);
      }
      return d;
    };
    for (const r of days) {
      // Lock-only rows (created by a booking, nothing changed) say nothing new.
      if (!r.closed && r.capacity == null) continue;
      const d = dayOf(fromDateOnly(r.date));
      d.closed = r.closed;
      d.reason = r.note;
      if (r.capacity != null) {
        d.capacity = r.capacity;
        d.customCapacity = true;
      }
    }
    for (const b of bookings) {
      if (!isCalendarStatus(b.status)) continue;
      dayOf(fromDateOnly(b.eventDate)).bookings.push({
        id: b.id,
        reference: b.reference,
        status: b.status,
        customerName: b.customerName,
        serviceTime: b.serviceTime,
      });
    }
    return [...out.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  async listBlocked(): Promise<CateringBlockedDate[]> {
    const rows = await this.prisma.cateringDay.findMany({
      where: { closed: true, date: { gte: toDateOnly(klToday()) } },
      orderBy: { date: 'asc' },
      take: 400,
    });
    return rows.map((r) => ({ date: fromDateOnly(r.date), reason: r.note }));
  }

  /** Close one day. Bookings already on it stay; it just takes no new ones. */
  async block(dto: BlockCateringDateDto): Promise<CateringBlockedDate> {
    const [first] = await this.closeRange({
      from: dto.date,
      to: dto.date,
      reason: dto.reason,
    });
    return first;
  }

  async unblock(dateParam: string): Promise<{ date: string }> {
    const date = toDateOnly(dateParam);
    const res = await this.prisma.cateringDay.updateMany({
      where: { date, closed: true },
      data: { closed: false, note: null },
    });
    if (res.count === 0) throw new NotFoundException('That date is not closed.');
    return { date: dateParam };
  }

  /** Every date from..to inclusive, at most 366 days. */
  private datesBetween(from: string, to: string): string[] {
    toDateOnly(from);
    toDateOnly(to);
    if (from > to) {
      throw new BadRequestException('The end date must be on or after the start date.');
    }
    if (to > addDays(from, 365)) {
      throw new BadRequestException('Pick a range of one year or less.');
    }
    const out: string[] = [];
    for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
    return out;
  }

  /** Close every date in a range (Raya break, holiday). Existing bookings stay. */
  async closeRange(dto: {
    from: string;
    to: string;
    reason?: string;
  }): Promise<CateringBlockedDate[]> {
    if (dto.from < klToday()) {
      throw new BadRequestException('You cannot close dates in the past.');
    }
    const dates = this.datesBetween(dto.from, dto.to);
    const note = dto.reason?.trim() || null;
    await this.prisma.$transaction(
      dates.map((d) =>
        this.prisma.cateringDay.upsert({
          where: { date: toDateOnly(d) },
          create: { date: toDateOnly(d), closed: true, note },
          update: { closed: true, note },
        }),
      ),
    );
    return dates.map((date) => ({ date, reason: note }));
  }

  /** Open every date in a range again. */
  async openRange(dto: { from: string; to: string }): Promise<{ opened: number }> {
    this.datesBetween(dto.from, dto.to);
    const res = await this.prisma.cateringDay.updateMany({
      where: {
        date: { gte: toDateOnly(dto.from), lte: toDateOnly(dto.to) },
        closed: true,
      },
      data: { closed: false, note: null },
    });
    return { opened: res.count };
  }

  /** Sets for one day. null goes back to the default from Settings. */
  async setDayCapacity(
    dateParam: string,
    capacity: number | null,
  ): Promise<{ date: string; capacity: number | null }> {
    const date = toDateOnly(dateParam);
    await this.prisma.cateringDay.upsert({
      where: { date },
      create: { date, capacity },
      update: { capacity },
    });
    return { date: dateParam, capacity };
  }

  // ─── Receipts ───────────────────────────────────────────────────────────────

  /** Throws unless this booking can take another receipt. Called before the file is stored. */
  async assertCanAddReceipt(accessToken: string): Promise<void> {
    const booking = await this.findByToken(accessToken);
    this.checkReceiptAllowed(booking.status, booking.receipts?.length ?? 0);
  }

  private checkReceiptAllowed(status: CateringBookingStatus, count: number) {
    if (status !== 'PENDING' && status !== 'APPROVED') {
      throw new ConflictException({
        code: 'INVALID_STATE',
        message: 'This booking is closed, so it cannot take a receipt. Message us if you paid.',
      });
    }
    if (count >= MAX_RECEIPTS) {
      throw new ConflictException({
        code: 'TOO_MANY_RECEIPTS',
        message: 'This booking already has 5 receipts. Message us if you need to send more.',
      });
    }
  }

  /** A payment receipt from the customer's booking page (phone or desktop). */
  async addReceipt(
    accessToken: string,
    file: { url: string; originalName: string },
  ): Promise<CateringBookingPublic> {
    const booking = await this.findByToken(accessToken);
    await this.prisma.$transaction(async (tx) => {
      // Lock the booking so two uploads cannot both pass the count.
      await tx.$queryRaw`SELECT id FROM "CateringBooking" WHERE id = ${booking.id} FOR UPDATE`;
      const fresh = await tx.cateringBooking.findUniqueOrThrow({
        where: { id: booking.id },
        select: { status: true, _count: { select: { receipts: true } } },
      });
      this.checkReceiptAllowed(fresh.status, fresh._count.receipts);
      await tx.cateringReceipt.create({
        data: {
          bookingId: booking.id,
          fileUrl: file.url,
          fileName: file.originalName.slice(0, 160) || null,
        },
      });
    });
    const updated = await this.findByToken(accessToken);
    void this.email.ownerReceiptUploaded(updated);
    const [rules, payment] = await Promise.all([this.rules(), this.paymentDetails()]);
    return toBookingPublic(updated, rules.cateringCancelCutoffDays, payment);
  }
}

/** Amount asked first: the whole total, or half rounded to the sen. */
function dueFor(total: Prisma.Decimal, choice: 'DEPOSIT' | 'FULL'): Prisma.Decimal {
  return choice === 'FULL'
    ? total
    : total.div(2).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

/** Payment fields set when the owner approves with "payment received". */
function paidOnApprove(b: CateringBooking): { depositPaidAt: Date; balancePaidAt?: Date } {
  const now = new Date();
  return {
    depositPaidAt: b.depositPaidAt ?? now,
    // Paid in full: nothing left to collect.
    ...(b.paymentChoice === 'FULL' ? { balancePaidAt: b.balancePaidAt ?? now } : {}),
  };
}
