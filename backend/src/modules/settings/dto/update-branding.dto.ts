import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Partial update; send empty string to clear a field. */
export class UpdateBrandingDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  companyLogoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  paymentQrUrl?: string;

  /** E.164 or whatsapp:+… — admin receives new-order WhatsApp alerts here. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  adminWhatsappNumber?: string;
}
