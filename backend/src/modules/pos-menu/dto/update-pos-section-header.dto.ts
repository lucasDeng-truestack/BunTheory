import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePosSectionHeaderDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  subtitle?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
