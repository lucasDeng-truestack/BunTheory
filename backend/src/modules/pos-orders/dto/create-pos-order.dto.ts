import {
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PosOrderLineType, PosPaymentMethod, PosServiceType } from '@prisma/client';

export class ComboSelectionDto {
  @IsString()
  slotId: string;

  @IsString()
  optionId: string;
}

export class PosOrderItemDto {
  @IsEnum(PosOrderLineType)
  lineType: PosOrderLineType;

  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboSelectionDto)
  comboSelections?: ComboSelectionDto[];
}

export class CreatePosOrderDto {
  @IsString()
  customerName: string;

  @IsEnum(PosServiceType)
  serviceType: PosServiceType;

  @IsEnum(PosPaymentMethod)
  paymentMethod: PosPaymentMethod;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tipAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([0, 5, 10])
  discountPercent?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosOrderItemDto)
  items: PosOrderItemDto[];
}
