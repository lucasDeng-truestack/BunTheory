import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const MONEY_MAX = 99_999_999.99;

export class ApproveCateringBookingDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MONEY_MAX)
  quoteAmount?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MONEY_MAX)
  depositAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNotes?: string;

  /** true: the receipt was checked, so stamp the first payment (and the balance if paid in full). */
  @IsOptional()
  @IsBoolean()
  markPaid?: boolean;
}

export class DeclineCateringBookingDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/** Partial update of money tracking and notes. null clears an amount. */
export class UpdateCateringBookingDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MONEY_MAX)
  quoteAmount?: number | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MONEY_MAX)
  depositAmount?: number | null;

  /** true stamps depositPaidAt = now, false clears it. */
  @IsOptional()
  @IsBoolean()
  depositPaid?: boolean;

  /** true stamps balancePaidAt = now, false clears it. */
  @IsOptional()
  @IsBoolean()
  balancePaid?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNotes?: string;
}

/** A run of dates, both ends included, YYYY-MM-DD. */
export class CateringDateRangeDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

/** Delivery hours for every date from..to. null start and end = back to the usual hours. */
export class CateringRangeHoursDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  start: string | null;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  end: string | null;
}

/** One day's sets and delivery hours. A field left out stays as it is; null goes back to the default. */
export class SetCateringDayDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200)
  capacity?: number | null;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  deliveryStart?: string | null;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  deliveryEnd?: string | null;
}

export class BlockCateringDateDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
