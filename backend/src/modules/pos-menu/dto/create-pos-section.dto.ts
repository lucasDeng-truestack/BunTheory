import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreatePosSectionDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
