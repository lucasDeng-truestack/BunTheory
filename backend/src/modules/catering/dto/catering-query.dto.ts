import { Type } from 'class-transformer';
import { CateringBookingStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** GET /catering/availability — both optional; defaults to the whole bookable window. */
export class AvailabilityQueryDto {
  @IsOptional()
  @Matches(DATE)
  from?: string;

  @IsOptional()
  @Matches(DATE)
  to?: string;
}

/** GET /catering/admin/bookings */
export class ListCateringBookingsQueryDto {
  @IsOptional()
  @IsEnum(CateringBookingStatus)
  status?: CateringBookingStatus;

  @IsOptional()
  @Matches(DATE)
  from?: string;

  @IsOptional()
  @Matches(DATE)
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  take?: number;
}
