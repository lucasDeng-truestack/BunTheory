import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ShopService } from './shop.service';
import {
  CancelShopOrderDto,
  MarkShopPaymentDto,
  SetShopDayDto,
  ShopDateRangeDto,
  ShopOrderQueryDto,
  ShopRangeHoursDto,
} from './dto/shop-admin.dto';

/** Owner-only Bakar & Roast shop admin: list orders, view one, confirm payment, cancel. */
@Controller('shop/admin')
@UseGuards(AdminAuthGuard)
export class ShopAdminController {
  constructor(private readonly shop: ShopService) {}

  @Get('orders')
  list(@Query() q: ShopOrderQueryDto) {
    return this.shop.listOrders(q);
  }

  @Get('orders/:id')
  get(@Param('id') id: string) {
    return this.shop.getAdminOrder(id);
  }

  /** Confirm a real payment landed (deposit or full) before the order proceeds. */
  @Post('orders/:id/payment')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER')
  markPayment(@Param('id') id: string, @Body() dto: MarkShopPaymentDto) {
    return this.shop.markPayment(id, dto);
  }

  @Post('orders/:id/cancel')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER')
  cancel(@Param('id') id: string, @Body() dto: CancelShopOrderDto) {
    return this.shop.cancel(id, dto);
  }

  // ─── Schedule (availability rules live in SystemSettings via /settings/shop) ──

  /** The live rules plus every upcoming owner-set day. */
  @Get('schedule')
  schedule() {
    return this.shop.schedule();
  }

  /** Close every date from..to (a break, a day off). */
  @Post('days/close')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER')
  closeRange(@Body() dto: ShopDateRangeDto) {
    return this.shop.closeRange(dto);
  }

  /** Open every date from..to again. */
  @Post('days/open')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER')
  openRange(@Body() dto: ShopDateRangeDto) {
    return this.shop.openRange(dto);
  }

  /** Serving hours for every date in a range. */
  @Post('days/hours')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER')
  rangeHours(@Body() dto: ShopRangeHoursDto) {
    return this.shop.setRangeHours(dto);
  }

  /** One day's closure and serving hours. */
  @Patch('days/:date')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER')
  setDay(@Param('date') date: string, @Body() dto: SetShopDayDto) {
    return this.shop.setDay(date, dto);
  }
}
