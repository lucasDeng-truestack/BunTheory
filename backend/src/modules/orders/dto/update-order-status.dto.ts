import { IsEnum } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsEnum(['RECEIVED', 'PREPARING', 'READY', 'DELIVERED'])
  status: 'RECEIVED' | 'PREPARING' | 'READY' | 'DELIVERED';
}
