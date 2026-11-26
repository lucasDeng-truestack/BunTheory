import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { UploadsService } from '../uploads/uploads.service';
import { isAllowedPaymentReceiptUpload } from '../uploads/uploads.controller';
import { ShopService } from './shop.service';
import { CreateShopOrderDto } from './dto/create-shop-order.dto';

/** Public Bakar & Roast shop API (the /order flow); writes are throttled. No sign-in needed. */
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

  /** Live open dates and the slots on each. Not cached: it must reflect owner changes at once. */
  @Get('availability')
  availability() {
    return this.shop.availability();
  }

  @Post('orders')
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: { limit: 10, ttl: 3600000 },
    day: { limit: 20, ttl: 86400000 },
  })
  create(@Body() dto: CreateShopOrderDto) {
    return this.shop.createOrder(dto);
  }

  @Get('orders/:accessToken')
  order(@Param('accessToken') accessToken: string) {
    return this.shop.getPublicOrder(accessToken);
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
