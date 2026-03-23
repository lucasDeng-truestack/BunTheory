import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MenuService } from './menu.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  /** Admin: draft menu (JWT). */
  @Get('draft')
  @UseGuards(JwtAuthGuard)
  findDraft(@Query('available') available?: string) {
    const availableOnly = available === 'true';
    return this.menuService.findAllDraft(availableOnly);
  }

  /** Public: published snapshot for active batch window only. */
  @Get()
  findPublished(@Query('available') available?: string) {
    const availableOnly = available === 'true';
    return this.menuService.findPublishedForStorefront(availableOnly);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.menuService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createMenuDto: CreateMenuDto) {
    return this.menuService.create(createMenuDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateMenuDto: UpdateMenuDto) {
    return this.menuService.update(id, updateMenuDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.menuService.remove(id);
  }
}
