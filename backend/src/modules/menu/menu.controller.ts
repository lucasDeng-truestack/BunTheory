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
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  /** Admin: live menu with relations (JWT). */
  @Get('draft')
  @UseGuards(AdminAuthGuard)
  findDraft(@Query('available') available?: string) {
    const availableOnly = available === 'true';
    return this.menuService.findAllDraft(availableOnly);
  }

  /** Public: live menu (same catalog as admin edits). */
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
  @UseGuards(AdminAuthGuard)
  create(@Body() createMenuDto: CreateMenuDto) {
    return this.menuService.create(createMenuDto);
  }

  @Patch(':id')
  @UseGuards(AdminAuthGuard)
  update(@Param('id') id: string, @Body() updateMenuDto: UpdateMenuDto) {
    return this.menuService.update(id, updateMenuDto);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  remove(@Param('id') id: string) {
    return this.menuService.remove(id);
  }
}
