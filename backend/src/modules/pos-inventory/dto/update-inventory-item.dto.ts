import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateInventoryItemDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsBoolean()
  isCountable?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantityOnHand?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockThreshold?: number | null;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
