import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreatePosSectionHeaderDto {
  @IsString()
  categoryId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
