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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

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
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('date') date?: string,
    @Query('customer') customer?: string,
    @Query('menuId') menuId?: string,
    @Query('batchId') batchId?: string,
  ) {
    return this.ordersService.findAll({ date, customer, menuId, batchId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, dto.status);
  }
}
