import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  MinLength,
  IsDateString,
} from 'class-validator';

export class CreateBatchDto {
  @IsOptional()
  @IsString()
  label?: string;

  /** ISO date string for the Thursday (or fulfillment day) */
  @IsDateString()
  fulfillmentDate: string;

  @IsDateString()
  opensAt: string;

  @IsDateString()
  closesAt: string;

  @IsInt()
  @Min(1)
  maxItems: number;
}
