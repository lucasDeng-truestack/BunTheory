import {
  IsString,
  IsEnum,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
  Min,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemSelectionDto {
  @IsString()
  groupId: string;

  @IsArray()
  @IsString({ each: true })
  optionIds: string[];
}

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

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemSelectionDto)
  selections?: OrderItemSelectionDto[];
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

  @ValidateIf((o: CreateOrderDto) => o.type === 'DELIVERY')
  @IsString()
  @MinLength(5, {
    message: 'Please enter a full delivery address (at least 5 characters).',
  })
  @MaxLength(500)
  deliveryAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryNotes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsEnum(['PAY_LATER', 'PAY_NOW'])
  paymentChoice?: 'PAY_LATER' | 'PAY_NOW';

  /**
   * When paymentChoice is PAY_NOW: optional URL from POST /uploads/payment-receipt.
   * Omit if the customer will send proof separately (e.g. WhatsApp).
   */
  @IsOptional()
  @IsString()
  @MinLength(1)
  receiptUrl?: string;
}
