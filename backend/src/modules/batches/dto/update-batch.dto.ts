import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsDateString,
} from 'class-validator';

export class UpdateBatchDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsDateString()
  fulfillmentDate?: string;

  @IsOptional()
  @IsDateString()
  opensAt?: string;

  @IsOptional()
  @IsDateString()
  closesAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxItems?: number;
}
