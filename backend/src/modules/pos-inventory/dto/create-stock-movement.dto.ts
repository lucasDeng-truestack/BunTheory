import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { InventoryMovementType } from '@prisma/client';

export class CreateStockMovementDto {
  @IsString()
  itemId: string;

  @IsEnum(InventoryMovementType)
  type: InventoryMovementType;

  /** Positive = stock in, negative = stock out. */
  @IsNumber()
  quantityChange: number;

  @IsOptional()
  @IsNumber()
  unitCost?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
