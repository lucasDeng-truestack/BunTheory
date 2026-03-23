import { IsNumber, IsBoolean, Min, IsOptional } from 'class-validator';

export class UpdateMaxOrdersDto {
  @IsNumber()
  @Min(1)
  maxOrdersPerDay: number;
}

export class ToggleOrderingDto {
  @IsBoolean()
  orderingEnabled: boolean;
}
