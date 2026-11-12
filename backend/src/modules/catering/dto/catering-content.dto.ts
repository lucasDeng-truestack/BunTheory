import { PartialType } from '@nestjs/mapped-types';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCateringPackageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  tagline?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;

  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  includes: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string;

  @IsInt()
  @Min(1)
  @Max(5000)
  minGuests: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5000)
  maxGuests?: number | null;

  /** Price per set or per pax (priceUnit). Null or missing = quoted after the request. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000000)
  price?: number | null;

  @IsOptional()
  @IsIn(['PER_SET', 'PER_PAX'])
  priceUnit?: 'PER_SET' | 'PER_PAX';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateCateringPackageDto extends PartialType(
  CreateCateringPackageDto,
) {}

export class CreateCateringGalleryImageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  imageUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  caption?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateCateringGalleryImageDto extends PartialType(
  CreateCateringGalleryImageDto,
) {}

export class CreateCateringTestimonialDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(600)
  quote: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  role?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateCateringTestimonialDto extends PartialType(
  CreateCateringTestimonialDto,
) {}
