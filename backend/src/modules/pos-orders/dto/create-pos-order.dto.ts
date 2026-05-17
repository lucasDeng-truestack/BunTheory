import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PosPaymentMethod, PosServiceType } from '@prisma/client';

export class PosOrderItemDto {
  @IsString()
  menuItemId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  remarks?: string;
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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosOrderItemDto)
  items: PosOrderItemDto[];
}
