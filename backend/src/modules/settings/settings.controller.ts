import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import {
  UpdateMaxOrdersDto,
  ToggleOrderingDto,
  UpdateMinimumDeliveryDto,
} from './dto/update-settings.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { UpdateOutletDto } from './dto/update-outlet.dto';
import { UpdateCateringSettingsDto } from './dto/update-catering-settings.dto';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /** Full settings, JWT only. */
  @Get('admin')
  @UseGuards(AdminAuthGuard)
  getSettingsAdmin() {
    return this.settingsService.getSettings();
  }

  /** Public storefront (no admin-only fields). */
  @Get()
  getSettingsPublic() {
    return this.settingsService.getPublicSettings();
  }

  @Patch('max-orders')
  @UseGuards(AdminAuthGuard)
  updateMaxOrders(@Body() dto: UpdateMaxOrdersDto) {
    return this.settingsService.updateMaxOrders(dto.maxOrdersPerDay);
  }

  @Patch('toggle-ordering')
  @UseGuards(AdminAuthGuard)
  toggleOrdering(@Body() dto: ToggleOrderingDto) {
    return this.settingsService.toggleOrdering(dto.orderingEnabled);
  }

  @Patch('minimum-delivery')
  @UseGuards(AdminAuthGuard)
  updateMinimumDelivery(@Body() dto: UpdateMinimumDeliveryDto) {
    return this.settingsService.updateMinimumDelivery(
      dto.minimumDeliveryAmount ?? null,
    );
  }

  @Patch('branding')
  @UseGuards(AdminAuthGuard)
  updateBranding(@Body() dto: UpdateBrandingDto) {
    return this.settingsService.updateBranding(dto);
  }

  @Patch('outlet')
  @UseGuards(AdminAuthGuard)
  updateOutlet(@Body() dto: UpdateOutletDto) {
    return this.settingsService.updateOutlet(dto);
  }

  /** Bakar & Roast catering booking rules. */
  @Patch('catering')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  updateCatering(@Body() dto: UpdateCateringSettingsDto) {
    return this.settingsService.updateCatering(dto);
  }
}
