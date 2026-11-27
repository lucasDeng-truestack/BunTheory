import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
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

  /**
   * Business WhatsApp number, as typed ("011-7512 6433" or "+60 11-7512 6433"); stored as digits
   * with the country code. Empty string goes back to the built-in default.
   */
  @IsOptional()
  @IsString()
  @MaxLength(30)
  shopWhatsappNumber?: string;

  // Where customers pay for /order. Empty string clears a field.
  @IsOptional()
  @IsString()
  @MaxLength(80)
  shopBankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  shopBankAccountName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  shopBankAccountNumber?: string;

  /** QR image from POST /uploads/image (a full https URL, or a local /uploads path). */
  @IsOptional()
  @ValidateIf((o: UpdateShopSettingsDto) => o.shopPaymentQrUrl !== '')
  @IsString()
  @MaxLength(2048)
  @Matches(/^(https?:\/\/|\/(?!\/))\S+$/, { message: 'The QR image link is not valid.' })
  shopPaymentQrUrl?: string;
}
