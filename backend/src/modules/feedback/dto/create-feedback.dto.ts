import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFeedbackDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message: string;

  /** Internal order id (cuid) when submitted from the order success page. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  orderId?: string;
}
