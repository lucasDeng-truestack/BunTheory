import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreatePosPurchaseDto } from './dto/create-pos-purchase.dto';
import { PosPurchasesService } from './pos-purchases.service';

@Controller('pos/purchases')
@UseGuards(JwtAuthGuard)
export class PosPurchasesController {
  constructor(private readonly posPurchasesService: PosPurchasesService) {}

  @Get()
  list(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.posPurchasesService.findAll({ from, to });
  }

  @Post()
  create(@Body() dto: CreatePosPurchaseDto, @Req() req: Request) {
    const adminId = (req.user as { id?: string })?.id;
    return this.posPurchasesService.create(dto, adminId);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.posPurchasesService.delete(id);
  }
}
