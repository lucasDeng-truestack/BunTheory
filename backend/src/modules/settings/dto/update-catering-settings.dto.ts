import { IsEmail, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';

/** Partial update of the catering booking rules. Empty string clears the notify email. */
export class UpdateCateringSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  cateringMinNoticeDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  cateringBookingWindowMonths?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  cateringHoldExpiryDays?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  cateringCancelCutoffDays?: number;

  @IsOptional()
  @ValidateIf((o: UpdateCateringSettingsDto) => o.cateringNotifyEmail !== '')
  @IsEmail()
  @MaxLength(160)
  cateringNotifyEmail?: string;

  /** Default bookings (sets) taken per day. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  cateringDailySets?: number;

  /** Payment details shown to customers. Empty string clears. */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  cateringBankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  cateringBankAccountName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  cateringBankAccountNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  cateringPaymentQrUrl?: string;
}
