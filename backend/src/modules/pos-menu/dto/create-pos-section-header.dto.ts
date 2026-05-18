import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreatePosSectionHeaderDto {
  @IsString()
  categoryId: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1, { message: 'Subsection heading title cannot be empty' })
  title: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
