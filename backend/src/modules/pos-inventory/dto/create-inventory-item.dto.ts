import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { InventoryUnit } from '@prisma/client';

export class CreateInventoryItemDto {
  @IsString()
  name: string;

  @IsEnum(InventoryUnit)
  unit: InventoryUnit;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockThreshold?: number;
}
