import { IsEmail, IsInt, IsOptional, Max, MaxLength, Min, ValidateIf } from 'class-validator';

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
}
