import {
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/** Single-outlet config: name/address/hours, prep ETA, fees, tax, radius note. */
export class UpdateOutletDto {
  @IsOptional()
  @IsString()
  outletName?: string;

  @IsOptional()
  @IsString()
  outletAddress?: string;

  /** Free-form hours map, e.g. { mon: "11:00-21:00" }. */
  @IsOptional()
  @IsObject()
  outletHours?: Record<string, unknown> | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(600)
  prepTimeMinutes?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFee?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  processingFee?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRatePercent?: number;

  @IsOptional()
  @IsString()
  deliveryRadiusNote?: string;
}
