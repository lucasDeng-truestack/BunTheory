import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { OrdersService, withoutOwner } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { TrackOrderQueryDto } from './dto/track-order-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { CustomerAuthGuard } from '../../common/guards/customer-auth.guard';
import { OptionalAuthGuard } from '../../common/guards/optional-auth.guard';

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

  // Sign-in is optional: OptionalAuthGuard never rejects, so a guest (or a dead token) still orders.
  @Post()
  @UseGuards(OptionalAuthGuard)
  async create(@Body() createOrderDto: CreateOrderDto, @Req() req: Request) {
    // Anyone signed in on the site (a customer, or staff using the site) keeps the order.
    const userId = req.user?.id ?? null;
    return withoutOwner(await this.ordersService.create(createOrderDto, userId));
  }

  /** The signed-in customer's own orders, and their name and phone for checkout. */
  @Get('me')
  @UseGuards(CustomerAuthGuard)
  mine(@Req() req: Request) {
    return this.ordersService.mine(req.user!);
  }

  /** Public: live orders for a phone (excludes DELIVERED; last 7 days). */
  @Get('track')
  async track(@Query() query: TrackOrderQueryDto) {
    return (await this.ordersService.findTrackableByPhone(query.phone)).map(withoutOwner);
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
  async findOne(@Param('id') id: string) {
    return withoutOwner(await this.ordersService.findOne(id));
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
