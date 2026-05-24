import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ProductVariantDto {
  @IsString()
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
