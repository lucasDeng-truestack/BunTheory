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
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CateringService } from './catering.service';
import { CateringContentService } from './catering-content.service';
import {
  AvailabilityQueryDto,
  ListCateringBookingsQueryDto,
} from './dto/catering-query.dto';
import {
  ApproveCateringBookingDto,
  BlockCateringDateDto,
  CateringDateRangeDto,
  SetCateringDayDto,
  DeclineCateringBookingDto,
  UpdateCateringBookingDto,
} from './dto/catering-admin.dto';
import {
  CreateCateringGalleryImageDto,
  CreateCateringPackageDto,
  CreateCateringTestimonialDto,
  UpdateCateringGalleryImageDto,
  UpdateCateringPackageDto,
  UpdateCateringTestimonialDto,
} from './dto/catering-content.dto';

/** Owner/staff catering admin. Every route is JWT-guarded; writes need OWNER or MANAGER. */
@Controller('catering/admin')
export class CateringAdminController {
  constructor(
    private readonly catering: CateringService,
    private readonly content: CateringContentService,
  ) {}

  // ─── Bookings ───────────────────────────────────────────────────────────────

  @Get('bookings')
  @UseGuards(AdminAuthGuard)
  list(@Query() q: ListCateringBookingsQueryDto) {
    return this.catering.list(q);
  }

  // Declared before bookings/:id so "pending-count" is not read as an id.
  @Get('bookings/pending-count')
  @UseGuards(AdminAuthGuard)
  pendingCount() {
    return this.catering.pendingCount();
  }

  @Get('bookings/:id')
  @UseGuards(AdminAuthGuard)
  detail(@Param('id') id: string) {
    return this.catering.getAdmin(id);
  }

  @Patch('bookings/:id/approve')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  approve(@Param('id') id: string, @Body() dto: ApproveCateringBookingDto) {
    return this.catering.approve(id, dto);
  }

  @Patch('bookings/:id/decline')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  decline(@Param('id') id: string, @Body() dto: DeclineCateringBookingDto) {
    return this.catering.decline(id, dto);
  }

  @Patch('bookings/:id/cancel')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  cancel(@Param('id') id: string) {
    return this.catering.adminCancel(id);
  }

  @Patch('bookings/:id/complete')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  complete(@Param('id') id: string) {
    return this.catering.complete(id);
  }

  @Patch('bookings/:id')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  update(@Param('id') id: string, @Body() dto: UpdateCateringBookingDto) {
    return this.catering.update(id, dto);
  }

  // ─── Calendar and blocked dates ─────────────────────────────────────────────

  @Get('calendar')
  @UseGuards(AdminAuthGuard)
  calendar(@Query() q: AvailabilityQueryDto) {
    return this.catering.calendar(q);
  }

  @Get('blocked-dates')
  @UseGuards(AdminAuthGuard)
  blockedDates() {
    return this.catering.listBlocked();
  }

  @Post('blocked-dates')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  block(@Body() dto: BlockCateringDateDto) {
    return this.catering.block(dto);
  }

  @Delete('blocked-dates/:date')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  unblock(@Param('date') date: string) {
    return this.catering.unblock(date);
  }

  /** Close every date from..to (holiday, break). Bookings already made stay. */
  @Post('days/close')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  closeRange(@Body() dto: CateringDateRangeDto) {
    return this.catering.closeRange(dto);
  }

  /** Open every date from..to again. */
  @Post('days/open')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  openRange(@Body() dto: CateringDateRangeDto) {
    return this.catering.openRange(dto);
  }

  /** How many sets one day takes. */
  @Patch('days/:date')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  setDay(@Param('date') date: string, @Body() dto: SetCateringDayDto) {
    return this.catering.setDayCapacity(date, dto.capacity ?? null);
  }

  // ─── Packages ───────────────────────────────────────────────────────────────

  @Get('packages')
  @UseGuards(AdminAuthGuard)
  packages() {
    return this.content.listPackagesAdmin();
  }

  @Post('packages')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  createPackage(@Body() dto: CreateCateringPackageDto) {
    return this.content.createPackage(dto);
  }

  @Patch('packages/:id')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  updatePackage(@Param('id') id: string, @Body() dto: UpdateCateringPackageDto) {
    return this.content.updatePackage(id, dto);
  }

  /** Returns { id } when deleted, or the deactivated package when it has bookings. */
  @Delete('packages/:id')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  deletePackage(@Param('id') id: string) {
    return this.content.deletePackage(id);
  }

  // ─── Gallery ────────────────────────────────────────────────────────────────

  @Get('gallery')
  @UseGuards(AdminAuthGuard)
  gallery() {
    return this.content.listGalleryAdmin();
  }

  @Post('gallery')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  createGalleryImage(@Body() dto: CreateCateringGalleryImageDto) {
    return this.content.createGalleryImage(dto);
  }

  @Patch('gallery/:id')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  updateGalleryImage(
    @Param('id') id: string,
    @Body() dto: UpdateCateringGalleryImageDto,
  ) {
    return this.content.updateGalleryImage(id, dto);
  }

  @Delete('gallery/:id')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  deleteGalleryImage(@Param('id') id: string) {
    return this.content.deleteGalleryImage(id);
  }

  // ─── Testimonials ───────────────────────────────────────────────────────────

  @Get('testimonials')
  @UseGuards(AdminAuthGuard)
  testimonials() {
    return this.content.listTestimonialsAdmin();
  }

  @Post('testimonials')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  createTestimonial(@Body() dto: CreateCateringTestimonialDto) {
    return this.content.createTestimonial(dto);
  }

  @Patch('testimonials/:id')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  updateTestimonial(
    @Param('id') id: string,
    @Body() dto: UpdateCateringTestimonialDto,
  ) {
    return this.content.updateTestimonial(id, dto);
  }

  @Delete('testimonials/:id')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  deleteTestimonial(@Param('id') id: string) {
    return this.content.deleteTestimonial(id);
  }
}
