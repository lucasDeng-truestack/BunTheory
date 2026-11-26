import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/** On-the-hour time, "HH:00". Serving windows are whole hours. */
const HOUR = /^([01]\d|2[0-3]):00$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Owner marks a payment as received: the deposit (half) or the full total. */
export class MarkShopPaymentDto {
  @IsIn(['DEPOSIT', 'FULL'])
  stage: 'DEPOSIT' | 'FULL';
}

export class CancelShopOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class ShopOrderQueryDto {
  @IsOptional()
  @IsIn(['AWAITING_PAYMENT', 'DEPOSIT_PAID', 'PAID', 'CANCELLED', 'ALL'])
  status?: 'AWAITING_PAYMENT' | 'DEPOSIT_PAID' | 'PAID' | 'CANCELLED' | 'ALL';
}

/** A run of dates, both ends included, YYYY-MM-DD. */
export class ShopDateRangeDto {
  @Matches(DATE)
  from: string;

  @Matches(DATE)
  to: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

/** Serving hours for every date from..to. null start and end = back to the default hours. */
export class ShopRangeHoursDto {
  @Matches(DATE)
  from: string;

  @Matches(DATE)
  to: string;

  @IsOptional()
  @Matches(HOUR)
  start: string | null;

  @IsOptional()
  @Matches(HOUR)
  end: string | null;
}

/**
 * One day's override. A field left out stays as it is; null on a serving time goes back to the
 * default. Start-only is allowed — the end falls back to the default serving hour.
 */
export class SetShopDayDto {
  @IsOptional()
  @IsBoolean()
  closed?: boolean;

  @IsOptional()
  @Matches(HOUR)
  serveStart?: string | null;

  @IsOptional()
  @Matches(HOUR)
  serveEnd?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string | null;
}
