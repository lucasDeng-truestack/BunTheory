import { Module } from '@nestjs/common';
import { PosKitchenController } from './pos-kitchen.controller';
import { PosKitchenService } from './pos-kitchen.service';
import { PosOrdersModule } from '../pos-orders/pos-orders.module';

@Module({
  imports: [PosOrdersModule],
  controllers: [PosKitchenController],
  providers: [PosKitchenService],
})
export class PosKitchenModule {}
