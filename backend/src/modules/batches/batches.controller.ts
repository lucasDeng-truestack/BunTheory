import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BatchesService } from './batches.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('batches')
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  /** Public: current batch window + capacity for storefront */
  @Get('active')
  getActivePublic() {
    return this.batchesService.getStorefrontContext();
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  list() {
    return this.batchesService.listAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.batchesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateBatchDto) {
    return this.batchesService.create({
      label: dto.label,
      fulfillmentDate: dto.fulfillmentDate,
      opensAt: dto.opensAt,
      closesAt: dto.closesAt,
      maxItems: dto.maxItems,
    });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateBatchDto) {
    return this.batchesService.update(id, {
      ...(dto.label !== undefined && { label: dto.label }),
      ...(dto.fulfillmentDate !== undefined && {
        fulfillmentDate: new Date(dto.fulfillmentDate),
      }),
      ...(dto.opensAt !== undefined && { opensAt: new Date(dto.opensAt) }),
      ...(dto.closesAt !== undefined && { closesAt: new Date(dto.closesAt) }),
      ...(dto.maxItems !== undefined && { maxItems: dto.maxItems }),
    });
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  publish(@Param('id') id: string) {
    return this.batchesService.publish(id);
  }

  @Post(':id/close')
  @UseGuards(JwtAuthGuard)
  close(@Param('id') id: string) {
    return this.batchesService.closeBatch(id);
  }
}
