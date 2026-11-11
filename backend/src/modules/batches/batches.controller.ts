import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { BatchesService } from './batches.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';

@Controller('batches')
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Get()
  @UseGuards(AdminAuthGuard)
  findAll() {
    return this.batchesService.findAll();
  }

  @Get(':id')
  @UseGuards(AdminAuthGuard)
  findOne(@Param('id') id: string) {
    return this.batchesService.findOne(id);
  }

  @Post()
  @UseGuards(AdminAuthGuard)
  create(@Body() dto: CreateBatchDto) {
    return this.batchesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(AdminAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateBatchDto) {
    return this.batchesService.update(id, dto);
  }

  @Post(':id/publish')
  @UseGuards(AdminAuthGuard)
  publish(@Param('id') id: string) {
    return this.batchesService.publish(id);
  }

  @Post(':id/close')
  @UseGuards(AdminAuthGuard)
  close(@Param('id') id: string) {
    return this.batchesService.close(id);
  }

  @Post(':id/reopen')
  @UseGuards(AdminAuthGuard)
  reopen(@Param('id') id: string) {
    return this.batchesService.reopen(id);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  remove(@Param('id') id: string) {
    return this.batchesService.remove(id);
  }
}
