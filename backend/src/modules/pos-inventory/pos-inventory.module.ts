import { Module } from '@nestjs/common';
import { PosInventoryController } from './pos-inventory.controller';
import { PosInventoryService } from './pos-inventory.service';

@Module({
  controllers: [PosInventoryController],
  providers: [PosInventoryService],
  exports: [PosInventoryService],
})
export class PosInventoryModule {}
