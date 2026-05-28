import { Injectable } from '@nestjs/common';
import { PosOrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PosOrdersService } from '../pos-orders/pos-orders.service';

@Injectable()
export class PosKitchenService {
  constructor(
    private prisma: PrismaService,
    private posOrdersService: PosOrdersService,
  ) {}

  async getKitchenQueue() {
    return this.posOrdersService.findAll({
      status: PosOrderStatus.PLACED,
      sort: 'asc',
    });
  }

  async getPreparingQueue() {
    return this.posOrdersService.findAll({
      status: PosOrderStatus.PREPARING,
      sort: 'asc',
    });
  }

  async getReadyQueue() {
    return this.posOrdersService.findAll({
      status: PosOrderStatus.READY,
      sort: 'asc',
    });
  }

  async getActiveQueues() {
    const [placed, preparing, ready] = await Promise.all([
      this.posOrdersService.findAll({ status: PosOrderStatus.PLACED, sort: 'asc' }),
      this.posOrdersService.findAll({ status: PosOrderStatus.PREPARING, sort: 'asc' }),
      this.posOrdersService.findAll({ status: PosOrderStatus.READY, sort: 'asc' }),
    ]);
    return { placed, preparing, ready };
  }

  async advance(orderId: string, adminId?: string) {
    return this.posOrdersService.advanceStatus(orderId, adminId);
  }
}
