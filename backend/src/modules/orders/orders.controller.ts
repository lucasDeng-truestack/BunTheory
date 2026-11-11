import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { TrackOrderQueryDto } from './dto/track-order-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('today-count')
  getTodayCount() {
    return this.ordersService.getTodayItemCount();
  }

  @Get('can-order')
  canPlaceOrder() {
    return this.ordersService.getStorefrontContext();
  }

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  /** Public: live orders for a phone (excludes DELIVERED; last 7 days). */
  @Get('track')
  track(@Query() query: TrackOrderQueryDto) {
    return this.ordersService.findTrackableByPhone(query.phone);
  }

  @Get()
  @UseGuards(AdminAuthGuard)
  findAll(
    @Query('date') date?: string,
    @Query('customer') customer?: string,
    @Query('menuId') menuId?: string,
    @Query('batchId') batchId?: string,
    @Query('paymentOnly') paymentOnly?: string,
  ) {
    return this.ordersService.findAll({
      date,
      customer,
      menuId,
      batchId,
      paymentOnly,
    });
  }

  /** Admin: count of orders with status other than DELIVERED (sidebar badge). */
  @Get('pending-count')
  @UseGuards(AdminAuthGuard)
  pendingCount() {
    return this.ordersService.countNonDelivered();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(AdminAuthGuard)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, dto.status);
  }
}
