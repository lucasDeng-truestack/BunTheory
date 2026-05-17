import { IsEnum, IsNumber, IsString, Min } from 'class-validator';
import { InventoryUnit } from '@prisma/client';

export class SetRecipeIngredientDto {
  @IsString()
  inventoryItemId: string;

  @IsNumber()
  @Min(0)
  quantityUsed: number;

  @IsEnum(InventoryUnit)
  unit: InventoryUnit;
}
