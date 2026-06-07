import { Module } from '@nestjs/common';
import { PosInventoryModule } from '../pos-inventory/pos-inventory.module';
import { PosMenuController } from './pos-menu.controller';
import { PosMenuService } from './pos-menu.service';

@Module({
  imports: [PosInventoryModule],
  controllers: [PosMenuController],
  providers: [PosMenuService],
  exports: [PosMenuService],
})
export class PosMenuModule {}
