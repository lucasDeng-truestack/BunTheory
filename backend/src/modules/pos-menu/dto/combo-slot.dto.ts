import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ComboSlotOptionDto {
  @IsString()
  label: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceDelta?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class ComboSlotDto {
  @IsString()
  label: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboSlotOptionDto)
  options: ComboSlotOptionDto[];
}
