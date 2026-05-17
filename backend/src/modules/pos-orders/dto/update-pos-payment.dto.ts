import { IsEnum } from 'class-validator';
import { PosPaymentStatus } from '@prisma/client';

export class UpdatePosPaymentDto {
  @IsEnum(PosPaymentStatus)
  paymentStatus: PosPaymentStatus;
}
