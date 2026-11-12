import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from '../uploads/uploads.service';
import { isAllowedPaymentReceiptUpload } from '../uploads/uploads.controller';
import { Request } from 'express';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CateringService } from './catering.service';
import { CateringContentService } from './catering-content.service';
import { CreateCateringBookingDto } from './dto/create-catering-booking.dto';
import { AvailabilityQueryDto } from './dto/catering-query.dto';
import { OptionalAuthGuard } from '../../common/guards/optional-auth.guard';
import { CustomerAuthGuard } from '../../common/guards/customer-auth.guard';

/** Public Bakar & Roast catering API; writes are throttled. Sign-in is optional, except for `me/` routes. */
@Controller('catering')
export class CateringController {
  constructor(
    private readonly catering: CateringService,
    private readonly content: CateringContentService,
    private readonly uploads: UploadsService,
  ) {}

  @Get('packages')
  packages() {
    return this.content.listPackagesPublic();
  }

  @Get('availability')
  availability(@Query() q: AvailabilityQueryDto) {
    return this.catering.availability(q);
  }

  // Throttle first, so anonymous and signed-in requests are limited alike; OptionalAuthGuard never rejects.
  @Post('bookings')
  @UseGuards(ThrottlerGuard, OptionalAuthGuard)
  // Both apply: 10 per hour and 12 per day per IP.
  @Throttle({
    default: { limit: 10, ttl: 3600000 },
    day: { limit: 12, ttl: 86400000 },
  })
  createBooking(@Body() dto: CreateCateringBookingDto, @Req() req: Request) {
    return this.catering.createBooking(dto, req.user?.id ?? null);
  }

  @Get('me/bookings')
  @UseGuards(CustomerAuthGuard)
  myBookings(@Req() req: Request) {
    return this.catering.listMine(req.user!);
  }

  @Get('bookings/:accessToken')
  booking(@Param('accessToken') accessToken: string) {
    return this.catering.getPublicBooking(accessToken);
  }

  @Post('bookings/:accessToken/cancel')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 3600000 } })
  @SkipThrottle({ day: true })
  cancel(@Param('accessToken') accessToken: string) {
    return this.catering.customerCancel(accessToken);
  }

  /**
   * Payment receipt from the booking page, on phone or desktop. The unguessable
   * accessToken is the only key, as for the status page itself.
   */
  @Post('bookings/:accessToken/receipts')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 3600000 } })
  @SkipThrottle({ day: true })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_, file, cb) => cb(null, isAllowedPaymentReceiptUpload(file)),
    }),
  )
  async uploadReceipt(
    @Param('accessToken') accessToken: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Please choose a photo or PDF of your receipt (JPG, PNG, WebP or PDF, up to 5 MB).',
      );
    }
    // Check the booking exists, is open and has room before storing anything.
    await this.catering.assertCanAddReceipt(accessToken);
    const url = await this.uploads.saveFile(file);
    return this.catering.addReceipt(accessToken, { url, originalName: file.originalname });
  }

  @Get('gallery')
  gallery() {
    return this.content.listGalleryPublic();
  }

  @Get('testimonials')
  testimonials() {
    return this.content.listTestimonialsPublic();
  }
}
