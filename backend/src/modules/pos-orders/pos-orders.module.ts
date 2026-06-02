import { Module } from '@nestjs/common';
import { PosOrdersController } from './pos-orders.controller';
import { PosPublicReceiptController } from './pos-public-receipt.controller';
import { PosOrdersService } from './pos-orders.service';
import { PosRealtimeModule } from '../pos-realtime/pos-realtime.module';
import { PosInventoryModule } from '../pos-inventory/pos-inventory.module';

@Module({
  imports: [PosRealtimeModule, PosInventoryModule],
  controllers: [PosOrdersController, PosPublicReceiptController],
  providers: [PosOrdersService],
  exports: [PosOrdersService],
})
export class PosOrdersModule {}
