import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreatePosCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
