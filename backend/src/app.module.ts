import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { MenuModule } from './modules/menu/menu.module';
import { OrdersModule } from './modules/orders/orders.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SettingsModule } from './modules/settings/settings.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { BatchesModule } from './modules/batches/batches.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
// Weekend Grills POS
import { PosMenuModule } from './modules/pos-menu/pos-menu.module';
import { PosOrdersModule } from './modules/pos-orders/pos-orders.module';
import { PosKitchenModule } from './modules/pos-kitchen/pos-kitchen.module';
import { PosRealtimeModule } from './modules/pos-realtime/pos-realtime.module';
import { PosPurchasesModule } from './modules/pos-purchases/pos-purchases.module';
import { PosReportsModule } from './modules/pos-reports/pos-reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    MenuModule,
    BatchesModule,
    OrdersModule,
    NotificationsModule,
    SettingsModule,
    UploadsModule,
    FeedbackModule,
    // Weekend Grills POS modules
    PosRealtimeModule,
    PosMenuModule,
    PosOrdersModule,
    PosKitchenModule,
    PosPurchasesModule,
    PosReportsModule,
  ],
})
export class AppModule {}
