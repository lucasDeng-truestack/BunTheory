import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { MenuModule } from './modules/menu/menu.module';
import { OrdersModule } from './modules/orders/orders.module';
import { SettingsModule } from './modules/settings/settings.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { BatchesModule } from './modules/batches/batches.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { CateringModule } from './modules/catering/catering.module';
// Weekend Grills POS
import { PosMenuModule } from './modules/pos-menu/pos-menu.module';
import { PosOrdersModule } from './modules/pos-orders/pos-orders.module';
import { PosKitchenModule } from './modules/pos-kitchen/pos-kitchen.module';
import { PosRealtimeModule } from './modules/pos-realtime/pos-realtime.module';
import { PosPurchasesModule } from './modules/pos-purchases/pos-purchases.module';
import { PosReportsModule } from './modules/pos-reports/pos-reports.module';
import { PosInventoryModule } from './modules/pos-inventory/pos-inventory.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Registered once. Only routes with @UseGuards(ThrottlerGuard) are limited (no APP_GUARD).
    // Every named throttler applies to each such route unless skipped: routes that only want
    // `default` carry @SkipThrottle({ day: true }); each route sets its own limits via @Throttle.
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60000, limit: 10 },
      { name: 'day', ttl: 86400000, limit: 12 },
    ]),
    PrismaModule,
    AuthModule,
    MenuModule,
    BatchesModule,
    OrdersModule,
    SettingsModule,
    UploadsModule,
    FeedbackModule,
    // Bakar & Roast catering bookings
    CateringModule,
    // Weekend Grills POS modules
    PosRealtimeModule,
    PosMenuModule,
    PosOrdersModule,
    PosKitchenModule,
    PosPurchasesModule,
    PosReportsModule,
    PosInventoryModule,
  ],
})
export class AppModule {}
