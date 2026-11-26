import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  ValidateIf,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { SHOP_PACKAGE_MAX_IMAGES, SHOP_PACKAGE_MAX_INCLUDES } from '../shop.config';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
/** Trim every line and drop the empty ones. Non-strings are left for the validators to reject. */
const lines = ({ value }: { value: unknown }) =>
  Array.isArray(value)
    ? value.map((v) => (typeof v === 'string' ? v.trim() : v)).filter((v) => v !== '')
    : value;

/** Optional means left out. An explicit null is validated, and refused, like any other value. */
const given = (_: unknown, v: unknown) => v !== undefined;

/** Ringgit with up to two decimals, e.g. "88" or "88.50". Checked to be above zero in the service. */
const PRICE = /^\d{1,6}(\.\d{1,2})?$/;
/** An uploaded photo (full URL from POST /uploads/image) or a path under the site's public folder. */
const IMAGE = /^(https?:\/\/|\/(?!\/))\S+$/;

/** Owner creates a package for the /order menu. */
export class CreateShopPackageDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Give the package a name.' })
  @MaxLength(60)
  name: string;

  @ValidateIf(given)
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  tagline?: string;

  @ValidateIf(given)
  @Transform(trim)
  @IsString()
  @MaxLength(600)
  description?: string;

  @ValidateIf(given)
  @Transform(lines)
  @IsArray()
  @ArrayMaxSize(SHOP_PACKAGE_MAX_INCLUDES)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  includes?: string[];

  @ValidateIf(given)
  @Transform(lines)
  @IsArray()
  @ArrayMaxSize(SHOP_PACKAGE_MAX_IMAGES)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  @Matches(IMAGE, { each: true, message: 'A photo link is not valid.' })
  images?: string[];

  @Transform(trim)
  @IsString()
  @Matches(PRICE, { message: 'Enter the price in ringgit, like 88 or 88.50.' })
  price: string;

  @ValidateIf(given)
  @IsBoolean()
  active?: boolean;
}

/** Owner edits a package. Omitted fields stay as they are. */
export class UpdateShopPackageDto {
  @ValidateIf(given)
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Give the package a name.' })
  @MaxLength(60)
  name?: string;

  @ValidateIf(given)
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  tagline?: string;

  @ValidateIf(given)
  @Transform(trim)
  @IsString()
  @MaxLength(600)
  description?: string;

  @ValidateIf(given)
  @Transform(lines)
  @IsArray()
  @ArrayMaxSize(SHOP_PACKAGE_MAX_INCLUDES)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  includes?: string[];

  @ValidateIf(given)
  @Transform(lines)
  @IsArray()
  @ArrayMaxSize(SHOP_PACKAGE_MAX_IMAGES)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  @Matches(IMAGE, { each: true, message: 'A photo link is not valid.' })
  images?: string[];

  @ValidateIf(given)
  @Transform(trim)
  @IsString()
  @Matches(PRICE, { message: 'Enter the price in ringgit, like 88 or 88.50.' })
  price?: string;

  @ValidateIf(given)
  @IsBoolean()
  active?: boolean;
}

/** Every package id, in the order the menu should show them. */
export class ReorderShopPackagesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  ids: string[];
}
