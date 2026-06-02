import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ProductIngredientLinkDto {
  @IsString()
  inventoryItemId: string;

  @IsNumber()
  @Min(0.01)
  quantityPerUnit: number;
}

export class SetProductIngredientsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductIngredientLinkDto)
  ingredients: ProductIngredientLinkDto[];
}
