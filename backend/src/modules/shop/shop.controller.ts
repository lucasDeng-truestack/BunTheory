import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { UploadsService } from '../uploads/uploads.service';
import { isAllowedPaymentReceiptUpload } from '../uploads/uploads.controller';
import { CustomerAuthGuard } from '../../common/guards/customer-auth.guard';
import { OptionalAuthGuard } from '../../common/guards/optional-auth.guard';
import { ShopService } from './shop.service';
import { CreateShopOrderDto } from './dto/create-shop-order.dto';

/** Public Bakar & Roast shop API (the /order flow); writes are throttled. Sign-in is optional, except for `me`. */
@Controller('shop')
export class ShopController {
  constructor(
    private readonly shop: ShopService,
    private readonly uploads: UploadsService,
  ) {}

  @Get('config')
  config() {
    return this.shop.config();
  }

  /** The business WhatsApp number, for the site's "message us" links. */
  @Get('contact')
  contact() {
    return this.shop.contact();
  }

  /** Live open dates and the slots on each. Not cached: it must reflect owner changes at once. */
  @Get('availability')
  availability() {
    return this.shop.availability();
  }

  // Throttle first, so guests and signed-in customers are limited alike; OptionalAuthGuard never
  // rejects, so a dead or missing token still places a guest order.
  @Post('orders')
  @UseGuards(ThrottlerGuard, OptionalAuthGuard)
  @Throttle({
    default: { limit: 10, ttl: 3600000 },
    day: { limit: 20, ttl: 86400000 },
  })
  create(@Body() dto: CreateShopOrderDto, @Req() req: Request) {
    // Anyone signed in on the site (a customer, or staff using the site) keeps the order.
    const userId = req.user?.id ?? null;
    return this.shop.createOrder(dto, userId);
  }

  /** The signed-in customer's orders and the details to prefill checkout. */
  @Get('me')
  @UseGuards(CustomerAuthGuard)
  me(@Req() req: Request) {
    return this.shop.mine(req.user!);
  }

  @Get('orders/:accessToken')
  order(@Param('accessToken') accessToken: string) {
    return this.shop.getPublicOrder(accessToken);
  }

  /** Save this order to the signed-in account (a customer, or staff using the site). */
  @Post('orders/:accessToken/claim')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard, CustomerAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 3600000 } })
  @SkipThrottle({ day: true })
  claim(@Param('accessToken') accessToken: string, @Req() req: Request) {
    return this.shop.claim(accessToken, req.user!);
  }

  /** "I've made the payment": the customer's word, for the owner to check. */
  @Post('orders/:accessToken/paid')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 3600000 } })
  @SkipThrottle({ day: true })
  markPaid(@Param('accessToken') accessToken: string) {
    return this.shop.markCustomerPaid(accessToken);
  }

  /**
   * Payment receipt from the order page, on phone or desktop. The unguessable accessToken is the
   * only key, as for the order page itself, so returning from a banking app never loses the order.
   */
  @Post('orders/:accessToken/receipts')
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
    await this.shop.assertCanAddReceipt(accessToken);
    const url = await this.uploads.saveFile(file);
    return this.shop.addReceipt(accessToken, { url, originalName: file.originalname });
  }
}
