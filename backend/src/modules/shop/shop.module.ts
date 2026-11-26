import { Module } from '@nestjs/common';
import { UploadsModule } from '../uploads/uploads.module';
import { ShopController } from './shop.controller';
import { ShopAdminController } from './shop-admin.controller';
import { ShopService } from './shop.service';

@Module({
  imports: [UploadsModule],
  controllers: [ShopController, ShopAdminController],
  providers: [ShopService],
})
export class ShopModule {}
