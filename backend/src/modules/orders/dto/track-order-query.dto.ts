import { IsString, MinLength } from 'class-validator';

export class TrackOrderQueryDto {
  @IsString()
  @MinLength(8, { message: 'Phone must be at least 8 characters' })
  phone!: string;
}
