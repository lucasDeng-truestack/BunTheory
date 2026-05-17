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
import { CreatePosCategoryDto } from './dto/create-pos-category.dto';
import { CreatePosMenuItemDto } from './dto/create-pos-menu-item.dto';
import { UpdatePosMenuItemDto } from './dto/update-pos-menu-item.dto';
import { CreatePosSectionHeaderDto } from './dto/create-pos-section-header.dto';
import { UpdatePosSectionHeaderDto } from './dto/update-pos-section-header.dto';
import { PosMenuService } from './pos-menu.service';

@Controller('pos/menu')
@UseGuards(JwtAuthGuard)
export class PosMenuController {
  constructor(private readonly posMenuService: PosMenuService) {}

  @Get('categories/:categoryId/section-headers')
  listSectionHeaders(@Param('categoryId') categoryId: string) {
    return this.posMenuService.findSectionHeadersByCategory(categoryId);
  }

  @Post('section-headers')
  createSectionHeader(@Body() dto: CreatePosSectionHeaderDto) {
    return this.posMenuService.createSectionHeader(dto);
  }

  @Patch('section-headers/:id')
  updateSectionHeader(
    @Param('id') id: string,
    @Body() dto: UpdatePosSectionHeaderDto,
  ) {
    return this.posMenuService.updateSectionHeader(id, dto);
  }

  @Delete('section-headers/:id')
  deleteSectionHeader(@Param('id') id: string) {
    return this.posMenuService.deleteSectionHeader(id);
  }

  @Get('categories')
  listCategories() {
    return this.posMenuService.findAllCategories();
  }

  @Post('categories')
  createCategory(@Body() dto: CreatePosCategoryDto) {
    return this.posMenuService.createCategory(dto);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.posMenuService.deleteCategory(id);
  }

  @Get('items')
  listItems(@Query('available') available?: string) {
    return this.posMenuService.findAllItems(available === 'true');
  }

  @Get('items/:id')
  getItem(@Param('id') id: string) {
    return this.posMenuService.findOneItem(id);
  }

  @Post('items')
  createItem(@Body() dto: CreatePosMenuItemDto) {
    return this.posMenuService.createItem(dto);
  }

  @Patch('items/:id')
  updateItem(@Param('id') id: string, @Body() dto: UpdatePosMenuItemDto) {
    return this.posMenuService.updateItem(id, dto);
  }

  @Delete('items/:id')
  deleteItem(@Param('id') id: string) {
    return this.posMenuService.deleteItem(id);
  }
}
