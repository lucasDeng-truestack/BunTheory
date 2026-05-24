import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePosSectionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
