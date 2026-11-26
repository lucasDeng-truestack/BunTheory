import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes, randomInt } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { addDays, fromDateOnly, klToday, toDateOnly } from '../catering/catering.dates';
import {
  SHOP_MAX_RECEIPTS,
  SHOP_PACKAGES,
  SHOP_PACKAGE_BY_KEY,
  SHOP_PICKUP_AREA,
  SHOP_RULES_DEFAULT,
  SHOP_WINDOW_DAYS_MAX,
} from './shop.config';
import { CreateShopOrderDto } from './dto/create-shop-order.dto';
import {
  CancelShopOrderDto,
  MarkShopPaymentDto,
  SetShopDayDto,
  ShopDateRangeDto,
  ShopOrderQueryDto,
  ShopRangeHoursDto,
} from './dto/shop-admin.dto';
import {
  toShopOrderAdmin,
  toShopOrderPublic,
  type ShopOrderRow,
} from './shop.mappers';
import {
  ShopAvailabilityDay,
  ShopAvailabilityPublic,
  ShopConfigPublic,
  ShopOrderAdmin,
  ShopOrderCreated,
  ShopOrderPublic,
  ShopSchedule,
  ShopScheduleDay,
} from './shop.types';

/** No 0/O/1/I so references read cleanly over the phone. */
const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** The live availability rules, read from SystemSettings (or defaults when no row exists). */
type ShopRules = {
  earliestDate: string;
  ordersOpenDate: string | null;
  minNoticeDays: number;
  windowDays: number;
  serveStart: string;
  serveEnd: string;
  slotMinutes: number;
};

function newReference(): string {
  let s = 'BR-';
  for (let i = 0; i < 6; i++) s += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return s;
}

/** Minutes since midnight from "HH:mm". */
const minutesOf = (hhmm: string): number =>
  parseInt(hhmm.slice(0, 2), 10) * 60 + parseInt(hhmm.slice(3, 5), 10);

const clockOf = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/**
 * Back-to-back windows "HH:mm-HH:mm" of `slotMinutes` each, from start. A last piece shorter than
 * a slot is dropped. Empty when no whole slot fits.
 */
function slotsBetween(start: string, end: string, slotMinutes: number): string[] {
  const out: string[] = [];
  const last = minutesOf(end);
  for (let t = minutesOf(start); t + slotMinutes <= last; t += slotMinutes) {
    out.push(`${clockOf(t)}-${clockOf(t + slotMinutes)}`);
  }
  return out;
}

function dueFor(total: Prisma.Decimal, choice: 'DEPOSIT' | 'FULL'): Prisma.Decimal {
  return choice === 'FULL'
    ? total
    : total.div(2).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

/** Digits only, keeping a leading + if present. */
function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return raw.trim().startsWith('+') ? `+${digits}` : digits;
}

const include = { items: true, receipts: true } as const;

@Injectable()
export class ShopService {
  private readonly logger = new Logger(ShopService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** The live availability rules. Falls back to defaults when no SystemSettings row exists. */
  private async rules(): Promise<ShopRules> {
    const row = await this.prisma.systemSettings.findFirst({
      orderBy: { id: 'asc' },
      select: {
        shopEarliestDate: true,
        shopOrdersOpenDate: true,
        shopMinNoticeDays: true,
        shopWindowDays: true,
        shopServeStart: true,
        shopServeEnd: true,
        shopSlotMinutes: true,
      },
    });
    if (!row) return { ...SHOP_RULES_DEFAULT };
    return {
      earliestDate: row.shopEarliestDate,
      ordersOpenDate: row.shopOrdersOpenDate,
      minNoticeDays: row.shopMinNoticeDays,
      // Hard ceiling so the availability payload stays bounded whatever is stored.
      windowDays: Math.min(row.shopWindowDays, SHOP_WINDOW_DAYS_MAX),
      serveStart: row.shopServeStart,
      serveEnd: row.shopServeEnd,
      slotMinutes: row.shopSlotMinutes,
    };
  }

  /**
   * Fulfilment-date bounds. The earliest selectable date is the later of the official open date
   * and today + the notice buffer; the latest is today + the window. `maxDate` can fall before
   * `minDate` (a long buffer, a short window): callers treat that as "nothing open".
   */
  private window(rules: ShopRules): { minDate: string; maxDate: string } {
    const today = klToday();
    const buffered = addDays(today, rules.minNoticeDays);
    const minDate = buffered > rules.earliestDate ? buffered : rules.earliestDate;
    return { minDate, maxDate: addDays(today, rules.windowDays) };
  }

  /** Whether pre-orders have opened (today on or after the open date; null date = open now). */
  private ordersOpen(rules: ShopRules): boolean {
    return rules.ordersOpenDate == null || klToday() >= rules.ordersOpenDate;
  }

  /** Slots offered on one date, or null when that date takes no orders (closed or serves nothing). */
  private async slotsForDate(
    date: string,
    rules: ShopRules,
  ): Promise<string[] | null> {
    const row = await this.prisma.shopDay.findUnique({ where: { date: toDateOnly(date) } });
    if (row?.closed) return null;
    const slots =
      row && (row.serveStart || row.serveEnd)
        ? slotsBetween(row.serveStart ?? rules.serveStart, row.serveEnd ?? rules.serveEnd, rules.slotMinutes)
        : slotsBetween(rules.serveStart, rules.serveEnd, rules.slotMinutes);
    return slots.length > 0 ? slots : null;
  }

  async config(): Promise<ShopConfigPublic> {
    const rules = await this.rules();
    const { minDate, maxDate } = this.window(rules);
    return {
      packages: SHOP_PACKAGES.map((p) => ({
        key: p.key,
        name: p.name,
        tagline: p.tagline,
        description: p.description,
        includes: p.includes,
        images: p.images,
        price: p.price,
      })),
      pickupArea: SHOP_PICKUP_AREA,
      minDate,
      maxDate,
      defaultHours: { start: rules.serveStart, end: rules.serveEnd },
      ordersOpen: this.ordersOpen(rules),
      ordersOpenDate: rules.ordersOpenDate,
    };
  }

  /** The live picture the date/time picker needs: open dates and the slots on each. Uncached. */
  async availability(): Promise<ShopAvailabilityPublic> {
    const rules = await this.rules();
    const { minDate, maxDate } = this.window(rules);
    const head = {
      minDate,
      maxDate,
      ordersOpen: this.ordersOpen(rules),
      ordersOpenDate: rules.ordersOpenDate,
    };
    if (maxDate < minDate) return { ...head, days: [] };

    const overrides = await this.prisma.shopDay.findMany({
      where: { date: { gte: toDateOnly(minDate), lte: toDateOnly(maxDate) } },
      take: SHOP_WINDOW_DAYS_MAX + 1,
    });
    const dayMap = new Map(overrides.map((d) => [fromDateOnly(d.date), d]));
    const defaultSlots = slotsBetween(rules.serveStart, rules.serveEnd, rules.slotMinutes);

    const days: ShopAvailabilityDay[] = [];
    for (let d = minDate; d <= maxDate; d = addDays(d, 1)) {
      const o = dayMap.get(d);
      if (o?.closed) continue;
      const slots =
        o && (o.serveStart || o.serveEnd)
          ? slotsBetween(o.serveStart ?? rules.serveStart, o.serveEnd ?? rules.serveEnd, rules.slotMinutes)
          : defaultSlots;
      if (slots.length === 0) continue; // serves nothing that day = closed
      days.push({ date: d, slots });
    }
    return { ...head, days };
  }

  async createOrder(dto: CreateShopOrderDto): Promise<ShopOrderCreated> {
    if (typeof dto.website === 'string' && dto.website.trim() !== '') {
      throw new BadRequestException('Invalid request.');
    }

    // Idempotency: a repeat with the same key returns the order already created.
    if (dto.idempotencyKey) {
      const existing = await this.prisma.shopOrder.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) {
        return { reference: existing.reference, accessToken: existing.accessToken };
      }
    }

    const rules = await this.rules();
    if (!this.ordersOpen(rules)) {
      throw new BadRequestException({
        code: 'ORDERS_NOT_OPEN',
        message: `Ordering opens on ${rules.ordersOpenDate}. Please come back then.`,
      });
    }
    const { minDate, maxDate } = this.window(rules);
    if (dto.fulfilmentDate < minDate || dto.fulfilmentDate > maxDate) {
      throw new BadRequestException({
        code: 'DATE_OUT_OF_RANGE',
        message: `Please pick a date between ${minDate} and ${maxDate}.`,
      });
    }
    // The shop has no capacity, so no day lock is needed: the date is either open or not.
    const slots = await this.slotsForDate(dto.fulfilmentDate, rules);
    if (!slots) {
      throw new BadRequestException({
        code: 'DATE_CLOSED',
        message: 'We are not taking orders for that date. Please pick another day.',
      });
    }
    if (!slots.includes(dto.timeSlot)) {
      throw new BadRequestException({
        code: 'SLOT_UNAVAILABLE',
        message: 'That time is not available for the date you picked. Please pick another.',
      });
    }

    // Collapse duplicate package keys into one line with summed quantity.
    const quantities = new Map<string, number>();
    for (const item of dto.items) {
      const pkg = SHOP_PACKAGE_BY_KEY.get(item.packageKey);
      if (!pkg) {
        throw new BadRequestException({
          code: 'PACKAGE_UNAVAILABLE',
          message: 'One of the packages is not available. Please try again.',
        });
      }
      quantities.set(item.packageKey, (quantities.get(item.packageKey) ?? 0) + item.quantity);
    }

    // Price is always computed server-side from config, never trusted from the client.
    let subtotal = new Prisma.Decimal(0);
    const itemRows = [...quantities.entries()].map(([key, quantity]) => {
      const pkg = SHOP_PACKAGE_BY_KEY.get(key)!;
      const unitPrice = new Prisma.Decimal(pkg.price);
      subtotal = subtotal.add(unitPrice.mul(quantity));
      return { packageKey: key, packageName: pkg.name, unitPrice, quantity };
    });

    // No delivery fee line for now (arranged over WhatsApp), so total equals subtotal.
    const total = subtotal;
    const paymentChoice = dto.paymentChoice ?? 'DEPOSIT';
    const amountDue = dueFor(total, paymentChoice);

    const isDelivery = dto.type === 'DELIVERY';

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const created = await this.prisma.shopOrder.create({
          data: {
            reference: newReference(),
            accessToken: randomBytes(24).toString('base64url'),
            idempotencyKey: dto.idempotencyKey ?? null,
            type: dto.type,
            addressLine1: isDelivery ? dto.addressLine1! : null,
            addressLine2: isDelivery ? dto.addressLine2?.trim() || null : null,
            city: isDelivery ? dto.city! : null,
            state: isDelivery ? dto.state! : null,
            postcode: isDelivery ? dto.postcode! : null,
            deliveryNotes: dto.deliveryNotes?.trim() || null,
            fulfilmentDate: toDateOnly(dto.fulfilmentDate),
            timeSlot: dto.timeSlot,
            customerName: dto.customerName.trim(),
            customerPhone: normalisePhone(dto.customerPhone),
            customerEmail: dto.customerEmail?.trim().toLowerCase() || null,
            subtotal,
            total,
            paymentChoice,
            amountDue,
            items: { create: itemRows },
          },
        });
        return { reference: created.reference, accessToken: created.accessToken };
      } catch (e) {
        // Reference / accessToken collision: retry with fresh identifiers.
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002'
        ) {
          const target = (e.meta?.target as string[] | undefined) ?? [];
          if (target.some((t) => t.includes('idempotencyKey'))) {
            // Raced with an identical submit: return that order instead of erroring.
            const existing = await this.prisma.shopOrder.findUnique({
              where: { idempotencyKey: dto.idempotencyKey! },
            });
            if (existing) {
              return { reference: existing.reference, accessToken: existing.accessToken };
            }
          }
          if (target.some((t) => t.includes('reference') || t.includes('accessToken'))) {
            continue;
          }
        }
        throw e;
      }
    }
    throw new ConflictException('Could not place the order. Please try again.');
  }

  private async findByToken(accessToken: string): Promise<ShopOrderRow> {
    const order = await this.prisma.shopOrder.findUnique({
      where: { accessToken },
      include,
    });
    if (!order) throw new NotFoundException('Order not found.');
    return order;
  }

  async getPublicOrder(accessToken: string): Promise<ShopOrderPublic> {
    return toShopOrderPublic(await this.findByToken(accessToken));
  }

  async assertCanAddReceipt(accessToken: string): Promise<void> {
    const order = await this.findByToken(accessToken);
    if (order.status === 'CANCELLED') {
      throw new ConflictException('This order was cancelled.');
    }
    if ((order.receipts?.length ?? 0) >= SHOP_MAX_RECEIPTS) {
      throw new ConflictException(
        `You can upload up to ${SHOP_MAX_RECEIPTS} receipts. Message us if you need to send more.`,
      );
    }
  }

  async addReceipt(
    accessToken: string,
    file: { url: string; originalName?: string },
  ): Promise<ShopOrderPublic> {
    const order = await this.findByToken(accessToken);
    await this.prisma.shopReceipt.create({
      data: { orderId: order.id, fileUrl: file.url, fileName: file.originalName ?? null },
    });
    return toShopOrderPublic(await this.findByToken(accessToken));
  }

  // ─── Admin ──────────────────────────────────────────────────────────────────

  async listOrders(q: ShopOrderQueryDto): Promise<ShopOrderAdmin[]> {
    const status = q.status && q.status !== 'ALL' ? q.status : undefined;
    const orders = await this.prisma.shopOrder.findMany({
      where: status ? { status } : undefined,
      include,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return orders.map(toShopOrderAdmin);
  }

  async getAdminOrder(id: string): Promise<ShopOrderAdmin> {
    const order = await this.prisma.shopOrder.findUnique({ where: { id }, include });
    if (!order) throw new NotFoundException('Order not found.');
    return toShopOrderAdmin(order);
  }

  async markPayment(id: string, dto: MarkShopPaymentDto): Promise<ShopOrderAdmin> {
    const order = await this.prisma.shopOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found.');
    if (order.status === 'CANCELLED') {
      throw new ConflictException('This order was cancelled.');
    }
    const now = new Date();
    const data: Prisma.ShopOrderUpdateInput =
      dto.stage === 'FULL'
        ? {
            status: 'PAID',
            fullyPaidAt: now,
            depositPaidAt: order.depositPaidAt ?? now,
          }
        : { status: 'DEPOSIT_PAID', depositPaidAt: order.depositPaidAt ?? now };
    await this.prisma.shopOrder.update({ where: { id }, data });
    return this.getAdminOrder(id);
  }

  async cancel(id: string, dto: CancelShopOrderDto): Promise<ShopOrderAdmin> {
    const order = await this.prisma.shopOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found.');
    await this.prisma.shopOrder.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        adminNotes: dto.reason?.trim() || order.adminNotes,
      },
    });
    return this.getAdminOrder(id);
  }

  // ─── Admin: schedule (availability rules and per-day overrides) ───────────────

  /** The live rules plus every owner-set day from today on, for the schedule screen. */
  async schedule(): Promise<ShopSchedule> {
    const rules = await this.rules();
    const { minDate, maxDate } = this.window(rules);
    const rows = await this.prisma.shopDay.findMany({
      where: { date: { gte: toDateOnly(klToday()) } },
      orderBy: { date: 'asc' },
      take: 400,
    });
    return {
      earliestDate: rules.earliestDate,
      ordersOpenDate: rules.ordersOpenDate,
      minNoticeDays: rules.minNoticeDays,
      windowDays: rules.windowDays,
      defaultHours: { start: rules.serveStart, end: rules.serveEnd },
      slotMinutes: rules.slotMinutes,
      minDate,
      maxDate,
      // Skip rows that carry no override (an open day at default hours), e.g. left by reopening
      // a day or clearing a range's hours — they say nothing to the owner.
      days: rows
        .filter((r) => r.closed || r.serveStart != null || r.serveEnd != null)
        .map(toScheduleDay),
    };
  }

  /**
   * One day's override: close it, or set its serving hours. A field left out stays as it is;
   * null on a serving time goes back to the default. Clearing closed + both times removes the row.
   */
  async setDay(dateParam: string, dto: SetShopDayDto): Promise<ShopScheduleDay> {
    const date = toDateOnly(dateParam);
    const [rules, current] = await Promise.all([
      this.rules(),
      this.prisma.shopDay.findUnique({ where: { date } }),
    ]);
    const closed = dto.closed !== undefined ? dto.closed : (current?.closed ?? false);
    const serveStart =
      dto.serveStart !== undefined ? dto.serveStart : (current?.serveStart ?? null);
    const serveEnd = dto.serveEnd !== undefined ? dto.serveEnd : (current?.serveEnd ?? null);
    this.assertServesSomething(serveStart, serveEnd, rules);
    const note =
      dto.note !== undefined ? dto.note?.trim() || null : (current?.note ?? null);

    // An all-default, open day carries no information: drop the row.
    if (!closed && !serveStart && !serveEnd && !note) {
      await this.prisma.shopDay.deleteMany({ where: { date } });
      return { date: dateParam, closed: false, note: null, serveStart: null, serveEnd: null };
    }
    const data = { closed, serveStart, serveEnd, note };
    const row = await this.prisma.shopDay.upsert({
      where: { date },
      create: { date, ...data },
      update: data,
    });
    return toScheduleDay(row);
  }

  /** Close every date from..to inclusive (a break, a day off). */
  async closeRange(dto: ShopDateRangeDto): Promise<{ closed: number }> {
    if (dto.from < klToday()) {
      throw new BadRequestException('You cannot close dates in the past.');
    }
    const dates = this.datesBetween(dto.from, dto.to);
    const note = dto.reason?.trim() || null;
    await this.prisma.$transaction(
      dates.map((d) =>
        this.prisma.shopDay.upsert({
          where: { date: toDateOnly(d) },
          create: { date: toDateOnly(d), closed: true, note },
          update: { closed: true, note },
        }),
      ),
    );
    return { closed: dates.length };
  }

  /** Open every date from..to again (lifts a closure; keeps any custom hours). */
  async openRange(dto: ShopDateRangeDto): Promise<{ opened: number }> {
    this.datesBetween(dto.from, dto.to);
    const res = await this.prisma.shopDay.updateMany({
      where: {
        date: { gte: toDateOnly(dto.from), lte: toDateOnly(dto.to) },
        closed: true,
      },
      data: { closed: false, note: null },
    });
    return { opened: res.count };
  }

  /** Serving hours for every date in a range; null start and end go back to the default hours. */
  async setRangeHours(dto: ShopRangeHoursDto): Promise<{ updated: number }> {
    const dates = this.datesBetween(dto.from, dto.to);
    const rules = await this.rules();
    const start = dto.start ?? null;
    const end = dto.end ?? null;
    this.assertServesSomething(start, end, rules);
    await this.prisma.$transaction(
      dates.map((d) =>
        this.prisma.shopDay.upsert({
          where: { date: toDateOnly(d) },
          create: { date: toDateOnly(d), serveStart: start, serveEnd: end },
          update: { serveStart: start, serveEnd: end },
        }),
      ),
    );
    return { updated: dates.length };
  }

  /**
   * A serving window must leave at least one slot. Start-only is allowed (end falls back
   * to the default); the resolved window is what has to hold.
   */
  private assertServesSomething(
    start: string | null,
    end: string | null,
    rules: ShopRules,
  ): void {
    if (start == null && end == null) return;
    const resolved = slotsBetween(start ?? rules.serveStart, end ?? rules.serveEnd, rules.slotMinutes);
    if (resolved.length === 0) {
      throw new BadRequestException({
        code: 'INVALID_HOURS',
        message: 'Serving must end late enough to fit at least one time slot.',
      });
    }
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
}

/** A ShopDay row -> the admin schedule view. */
function toScheduleDay(row: {
  date: Date;
  closed: boolean;
  note: string | null;
  serveStart: string | null;
  serveEnd: string | null;
}): ShopScheduleDay {
  return {
    date: fromDateOnly(row.date),
    closed: row.closed,
    note: row.note,
    serveStart: row.serveStart,
    serveEnd: row.serveEnd,
  };
}
