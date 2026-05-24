import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PosProductType } from '@prisma/client';
import { ComboSlotDto } from './combo-slot.dto';
import { ProductVariantDto } from './product-variant.dto';

export class CreatePosProductDto {
  @IsString()
  sectionId: string;

  @IsEnum(PosProductType)
  type: PosProductType;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  basePrice: number;

  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ValidateIf((o: CreatePosProductDto) => o.type === 'COMBO')
  @IsOptional()
  @IsString()
  includesText?: string;

  @ValidateIf((o: CreatePosProductDto) => o.type === 'COMBO')
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboSlotDto)
  slots?: ComboSlotDto[];

  @ValidateIf((o: CreatePosProductDto) => o.type === 'VARIANT')
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];
}
