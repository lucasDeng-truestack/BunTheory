import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import {
  UpdateMaxOrdersDto,
  ToggleOrderingDto,
  UpdateMinimumDeliveryDto,
} from './dto/update-settings.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /** Full settings including admin WhatsApp — JWT only. */
  @Get('admin')
  @UseGuards(JwtAuthGuard)
  getSettingsAdmin() {
    return this.settingsService.getSettings();
  }

  /** Public storefront (no admin-only fields). */
  @Get()
  getSettingsPublic() {
    return this.settingsService.getPublicSettings();
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

  @Patch('minimum-delivery')
  @UseGuards(JwtAuthGuard)
  updateMinimumDelivery(@Body() dto: UpdateMinimumDeliveryDto) {
    return this.settingsService.updateMinimumDelivery(
      dto.minimumDeliveryAmount ?? null,
    );
  }

  @Patch('branding')
  @UseGuards(JwtAuthGuard)
  updateBranding(@Body() dto: UpdateBrandingDto) {
    return this.settingsService.updateBranding(dto);
  }
}
