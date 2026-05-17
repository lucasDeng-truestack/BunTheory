import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAdminDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  displayName?: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
