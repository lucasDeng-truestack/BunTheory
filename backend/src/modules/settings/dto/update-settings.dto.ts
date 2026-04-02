import {
  IsNumber,
  IsBoolean,
  Min,
  IsOptional,
  ValidateIf,
} from 'class-validator';

export class UpdateMaxOrdersDto {
  @IsNumber()
  @Min(1)
  maxOrdersPerDay: number;
}

export class ToggleOrderingDto {
  @IsBoolean()
  orderingEnabled: boolean;
}

export class UpdateMinimumDeliveryDto {
  /** Set to null to disable minimum (any cart can use delivery if offered). */
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsNumber()
  @Min(0)
  minimumDeliveryAmount?: number | null;
}
