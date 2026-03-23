import {
  IsString,
  IsEnum,
  IsArray,
  ValidateNested,
  MinLength,
  Min,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsOptional()
  @IsString()
  menuId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  slug?: string;

  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsString()
  @MinLength(1)
  customerName: string;

  @IsString()
  @MinLength(1)
  phone: string;

  @IsEnum(['PICKUP', 'DELIVERY'])
  type: 'PICKUP' | 'DELIVERY';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
