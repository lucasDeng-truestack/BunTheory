import { Module } from '@nestjs/common';
import { PosPurchasesController } from './pos-purchases.controller';
import { PosPurchasesService } from './pos-purchases.service';

@Module({
  controllers: [PosPurchasesController],
  providers: [PosPurchasesService],
  exports: [PosPurchasesService],
})
export class PosPurchasesModule {}
