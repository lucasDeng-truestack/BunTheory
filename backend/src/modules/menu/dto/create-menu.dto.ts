import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  MinLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MenuOptionGroupInputDto } from './menu-option.dto';

export class CreateMenuDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;

  @IsOptional()
  @IsBoolean()
  available?: boolean;

  /** Lightweight storefront grouping (e.g. "Buns", "Sides"). */
  @IsOptional()
  @IsString()
  category?: string;

  /** Manual sold-out toggle (storefront also derives sold-out from maxQuantity). */
  @IsOptional()
  @IsBoolean()
  soldOut?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(1)
  slug?: string;

  /** Max units that can be sold (all-time). Omit = unlimited. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuOptionGroupInputDto)
  optionGroups?: MenuOptionGroupInputDto[];
}
