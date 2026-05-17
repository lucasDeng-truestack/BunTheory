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
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { CreateInventoryPurchaseDto } from './dto/create-inventory-purchase.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { SetRecipeIngredientDto } from './dto/set-recipe-ingredient.dto';
import { PosInventoryService } from './pos-inventory.service';

@Controller('pos/inventory')
@UseGuards(JwtAuthGuard)
export class PosInventoryController {
  constructor(private readonly posInventoryService: PosInventoryService) {}

  // Items
  @Get('items')
  listItems() {
    return this.posInventoryService.findAllItems();
  }

  @Get('items/:id')
  getItem(@Param('id') id: string) {
    return this.posInventoryService.findOneItem(id);
  }

  @Post('items')
  createItem(@Body() dto: CreateInventoryItemDto) {
    return this.posInventoryService.createItem(dto);
  }

  @Patch('items/:id')
  updateItem(@Param('id') id: string, @Body() dto: Partial<CreateInventoryItemDto>) {
    return this.posInventoryService.updateItem(id, dto);
  }

  @Delete('items/:id')
  deleteItem(@Param('id') id: string) {
    return this.posInventoryService.deleteItem(id);
  }

  // Purchases
  @Get('purchases')
  listPurchases(@Query('itemId') itemId?: string) {
    return this.posInventoryService.findPurchases(itemId);
  }

  @Post('purchases')
  createPurchase(@Body() dto: CreateInventoryPurchaseDto) {
    return this.posInventoryService.createPurchase(dto);
  }

  // Stock movements
  @Get('movements')
  listMovements(@Query('itemId') itemId?: string) {
    return this.posInventoryService.findMovements(itemId);
  }

  @Post('movements')
  createMovement(@Body() dto: CreateStockMovementDto) {
    return this.posInventoryService.createMovement(dto);
  }

  // Recipe ingredients per menu item
  @Get('recipes/:menuItemId')
  getRecipe(@Param('menuItemId') menuItemId: string) {
    return this.posInventoryService.getRecipe(menuItemId);
  }

  @Post('recipes/:menuItemId')
  setRecipeIngredient(
    @Param('menuItemId') menuItemId: string,
    @Body() dto: SetRecipeIngredientDto,
  ) {
    return this.posInventoryService.setRecipeIngredient(menuItemId, dto);
  }

  @Delete('recipes/:menuItemId/:inventoryItemId')
  deleteRecipeIngredient(
    @Param('menuItemId') menuItemId: string,
    @Param('inventoryItemId') inventoryItemId: string,
  ) {
    return this.posInventoryService.deleteRecipeIngredient(menuItemId, inventoryItemId);
  }
}
