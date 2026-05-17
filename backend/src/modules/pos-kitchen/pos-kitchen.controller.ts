import { Controller, Get, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PosKitchenService } from './pos-kitchen.service';

@Controller('pos/kitchen')
@UseGuards(JwtAuthGuard)
export class PosKitchenController {
  constructor(private readonly posKitchenService: PosKitchenService) {}

  /** All active queues in one call for the kitchen display. */
  @Get('queues')
  getActiveQueues() {
    return this.posKitchenService.getActiveQueues();
  }

  @Get('queue/placed')
  getPlaced() {
    return this.posKitchenService.getKitchenQueue();
  }

  @Get('queue/preparing')
  getPreparing() {
    return this.posKitchenService.getPreparingQueue();
  }

  @Get('queue/ready')
  getReady() {
    return this.posKitchenService.getReadyQueue();
  }

  @Patch(':id/advance')
  advance(@Param('id') id: string, @Request() req: any) {
    return this.posKitchenService.advance(id, req.user?.id);
  }
}
