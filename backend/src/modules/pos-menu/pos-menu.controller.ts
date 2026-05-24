import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreatePosSectionDto } from './dto/create-pos-section.dto';
import { UpdatePosSectionDto } from './dto/update-pos-section.dto';
import { CreatePosProductDto } from './dto/create-pos-product.dto';
import { UpdatePosProductDto } from './dto/update-pos-product.dto';
import { ReorderProductsDto } from './dto/reorder-products.dto';
import { PosMenuService } from './pos-menu.service';

@Controller('pos/menu')
@UseGuards(JwtAuthGuard)
export class PosMenuController {
  constructor(private readonly posMenuService: PosMenuService) {}

  @Get()
  getFullMenu(@Query('available') available?: string) {
    return this.posMenuService.getFullMenu(available === 'true');
  }

  @Get('sections')
  listSections() {
    return this.posMenuService.findAllSections();
  }

  @Post('sections')
  createSection(@Body() dto: CreatePosSectionDto) {
    return this.posMenuService.createSection(dto);
  }

  @Patch('sections/:id')
  updateSection(@Param('id') id: string, @Body() dto: UpdatePosSectionDto) {
    return this.posMenuService.updateSection(id, dto);
  }

  @Delete('sections/:id')
  deleteSection(@Param('id') id: string) {
    return this.posMenuService.deleteSection(id);
  }

  @Get('products/:id')
  getProduct(@Param('id') id: string) {
    return this.posMenuService.findOneProduct(id);
  }

  @Post('products')
  createProduct(@Body() dto: CreatePosProductDto) {
    return this.posMenuService.createProduct(dto);
  }

  @Patch('products/:id')
  updateProduct(@Param('id') id: string, @Body() dto: UpdatePosProductDto) {
    return this.posMenuService.updateProduct(id, dto);
  }

  @Delete('products/:id')
  deleteProduct(@Param('id') id: string) {
    return this.posMenuService.deleteProduct(id);
  }

  @Patch('products/reorder')
  reorderProducts(@Body() dto: ReorderProductsDto) {
    return this.posMenuService.reorderProducts(dto);
  }
}
