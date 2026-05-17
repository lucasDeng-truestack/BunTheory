import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { PosOrderStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreatePosOrderDto } from './dto/create-pos-order.dto';
import { UpdatePosPaymentDto } from './dto/update-pos-payment.dto';
import { PosOrdersService } from './pos-orders.service';

@Controller('pos/orders')
@UseGuards(JwtAuthGuard)
export class PosOrdersController {
  constructor(private readonly posOrdersService: PosOrdersService) {}

  @Post()
  create(@Body() dto: CreatePosOrderDto, @Request() req: any) {
    return this.posOrdersService.create(dto, req.user?.id);
  }

  @Get()
  findAll(
    @Query('status') status?: PosOrderStatus,
    @Query('date') date?: string,
  ) {
    return this.posOrdersService.findAll({ status, date });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.posOrdersService.findOne(id);
  }

  @Patch(':id/advance')
  advance(@Param('id') id: string, @Request() req: any) {
    return this.posOrdersService.advanceStatus(id, req.user?.id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.posOrdersService.cancelOrder(id);
  }

  @Patch(':id/payment')
  updatePayment(
    @Param('id') id: string,
    @Body() dto: UpdatePosPaymentDto,
    @Request() req: any,
  ) {
    return this.posOrdersService.updatePayment(id, dto, req.user?.id);
  }
}
