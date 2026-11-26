import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ShopOrderItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(8)
  packageKey: string;

  @IsInt()
  @Min(1)
  @Max(50)
  quantity: number;
}

/** Public order request from the Bakar & Roast /order flow. */
export class CreateShopOrderDto {
  @IsIn(['PICKUP', 'DELIVERY'])
  type: 'PICKUP' | 'DELIVERY';

  // Delivery address: required only when type is DELIVERY. Country is always Malaysia (not sent).
  @ValidateIf((o: CreateShopOrderDto) => o.type === 'DELIVERY')
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  addressLine1?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(160)
  addressLine2?: string;

  @ValidateIf((o: CreateShopOrderDto) => o.type === 'DELIVERY')
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  city?: string;

  @ValidateIf((o: CreateShopOrderDto) => o.type === 'DELIVERY')
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  state?: string;

  @ValidateIf((o: CreateShopOrderDto) => o.type === 'DELIVERY')
  @Transform(trim)
  @Matches(/^\d{5}$/, { message: 'Enter a 5-digit postcode.' })
  postcode?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  deliveryNotes?: string;

  /** Malaysia-local fulfilment date, YYYY-MM-DD. */
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fulfilmentDate: string;

  /** Time window, "HH:mm-HH:mm". Validated against the allowed slot list in the service. */
  @Matches(/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/)
  timeSlot: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ShopOrderItemDto)
  items: ShopOrderItemDto[];

  /** Pay half now (DEPOSIT) or everything (FULL). */
  @IsOptional()
  @IsIn(['DEPOSIT', 'FULL'])
  paymentChoice?: 'DEPOSIT' | 'FULL';

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  customerName: string;

  @Transform(trim)
  @Matches(/^\+?(?:[\s-]*\d){7,15}[\s-]*$/, {
    message: 'Please enter a valid phone number.',
  })
  customerPhone: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @MaxLength(160)
  customerEmail?: string;

  /** Client-generated UUID so a double-tap or retry returns the same order. */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  idempotencyKey?: string;

  /** Honeypot: real customers never fill this. Non-empty means reject. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
