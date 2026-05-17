import { Module } from '@nestjs/common';
import { PosOrdersController } from './pos-orders.controller';
import { PosPublicReceiptController } from './pos-public-receipt.controller';
import { PosOrdersService } from './pos-orders.service';
import { PosRealtimeModule } from '../pos-realtime/pos-realtime.module';

@Module({
  imports: [PosRealtimeModule],
  controllers: [PosOrdersController, PosPublicReceiptController],
  providers: [PosOrdersService],
  exports: [PosOrdersService],
})
export class PosOrdersModule {}
