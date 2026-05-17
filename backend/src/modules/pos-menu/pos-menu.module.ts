import { Module } from '@nestjs/common';
import { PosMenuController } from './pos-menu.controller';
import { PosMenuService } from './pos-menu.service';

@Module({
  controllers: [PosMenuController],
  providers: [PosMenuService],
  exports: [PosMenuService],
})
export class PosMenuModule {}
