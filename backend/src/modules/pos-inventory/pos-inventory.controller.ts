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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { SetProductIngredientsDto } from './dto/set-product-ingredients.dto';
import { PosInventoryService } from './pos-inventory.service';

@Controller('pos/inventory')
@UseGuards(JwtAuthGuard)
export class PosInventoryController {
  constructor(private readonly inventoryService: PosInventoryService) {}

  @Get('items')
  listItems() {
    return this.inventoryService.findAllItems();
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
