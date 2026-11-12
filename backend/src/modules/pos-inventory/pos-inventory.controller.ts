import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { SetProductIngredientsDto } from './dto/set-product-ingredients.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { PosInventoryService } from './pos-inventory.service';

@Controller('pos/inventory')
@UseGuards(AdminAuthGuard)
export class PosInventoryController {
  constructor(private readonly inventoryService: PosInventoryService) {}

  @Get('items')
  listItems() {
    return this.inventoryService.findAllItems();
  }

  @Get('overview')
  overview() {
    return this.inventoryService.getOverview();
  }

  @Post('items/:id/adjust')
  adjustStock(@Param('id') id: string, @Body() dto: AdjustStockDto) {
    return this.inventoryService.adjustStock(id, dto);
  }

  @Post('items')
  createItem(@Body() dto: CreateInventoryItemDto) {
    return this.inventoryService.createItem(dto);
  }

  @Patch('items/:id')
  updateItem(@Param('id') id: string, @Body() dto: UpdateInventoryItemDto) {
    return this.inventoryService.updateItem(id, dto);
  }

  @Delete('items/:id')
  deleteItem(@Param('id') id: string) {
    return this.inventoryService.deleteItem(id);
  }

  @Get('products/:productId/ingredients')
  getProductIngredients(@Param('productId') productId: string) {
    return this.inventoryService.getProductIngredients(productId);
  }

  @Put('products/:productId/ingredients')
  setProductIngredients(
    @Param('productId') productId: string,
    @Body() dto: SetProductIngredientsDto,
  ) {
    return this.inventoryService.setProductIngredients(productId, dto);
  }
}
