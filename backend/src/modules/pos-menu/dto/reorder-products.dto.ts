import { IsArray, IsString } from 'class-validator';

export class ReorderProductsDto {
  @IsString()
  sectionId: string;

  @IsArray()
  @IsString({ each: true })
  productIds: string[];
}
