import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFeedbackDto) {
    if (dto.orderId) {
      const order = await this.prisma.order.findUnique({
        where: { id: dto.orderId },
        select: { id: true },
      });
      if (!order) {
        throw new BadRequestException('Invalid order reference.');
      }
    }

    const row = await this.prisma.appFeedback.create({
      data: {
        message: dto.message.trim(),
        orderId: dto.orderId ?? null,
      },
      select: { id: true, createdAt: true },
    });

    return { id: row.id, createdAt: row.createdAt };
  }

  findAllForAdmin() {
    return this.prisma.appFeedback.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true,
        message: true,
        orderId: true,
        createdAt: true,
        order: {
          select: { slugId: true, customerName: true },
        },
      },
    });
  }
}
