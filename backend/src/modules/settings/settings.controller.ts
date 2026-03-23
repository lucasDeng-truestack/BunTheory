import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateMaxOrdersDto, ToggleOrderingDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch('max-orders')
  @UseGuards(JwtAuthGuard)
  updateMaxOrders(@Body() dto: UpdateMaxOrdersDto) {
    return this.settingsService.updateMaxOrders(dto.maxOrdersPerDay);
  }

  @Patch('toggle-ordering')
  @UseGuards(JwtAuthGuard)
  toggleOrdering(@Body() dto: ToggleOrderingDto) {
    return this.settingsService.toggleOrdering(dto.orderingEnabled);
  }
}
