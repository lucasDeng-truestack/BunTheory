import {
  IsIn,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

/** A serving time on the hour or half hour, "HH:00" or "HH:30". */
const HOUR = /^([01]\d|2[0-3]):(00|30)$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Partial update of the Bakar & Roast shop (/order) availability rules. An empty-string
 * `shopOrdersOpenDate` clears it (orders open now).
 */
export class UpdateShopSettingsDto {
  /** Official open / earliest fulfilment date, YYYY-MM-DD. */
  @IsOptional()
  @Matches(DATE)
  shopEarliestDate?: string;

  /** Pre-orders accepted only from this date on. Empty string clears it (open now). */
  @IsOptional()
  @ValidateIf((o: UpdateShopSettingsDto) => o.shopOrdersOpenDate !== '')
  @Matches(DATE)
  shopOrdersOpenDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  shopMinNoticeDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  shopWindowDays?: number;

  @IsOptional()
  @Matches(HOUR)
  shopServeStart?: string;

  @IsOptional()
  @Matches(HOUR)
  shopServeEnd?: string;

  /** Length of one time slot, in minutes. */
  @IsOptional()
  @IsIn([30, 60, 90, 120])
  shopSlotMinutes?: number;
}
