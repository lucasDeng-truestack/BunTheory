import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Public booking request from the Bakar & Roast site. */
export class CreateCateringBookingDto {
  /** Malaysia-local event date, YYYY-MM-DD. */
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  eventDate: string;

  /** Serving time, 24h HH:mm. */
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  serviceTime: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  packageId: string;

  @IsInt()
  @Min(1)
  @Max(5000)
  guests: number;

  /** No longer asked for. Accepted from older clients and ignored when empty. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  occasion?: string;

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

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(160)
  customerEmail: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  eventAddress: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  dietaryNotes?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  notes?: string;

  /** Honeypot: real customers never fill this. Non-empty means reject. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
