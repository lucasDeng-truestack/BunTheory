import {
  IsBoolean,
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

export class BlockCateringDateDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
