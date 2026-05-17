import { IsString, MaxLength } from 'class-validator';

export class UpdateAdminDisplayNameDto {
  /** Empty string clears the display name (falls back to email in UI). */
  @IsString()
  @MaxLength(80)
  displayName: string;
}
