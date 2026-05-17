import {
  BadRequestException,
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { PosOrdersService } from './pos-orders.service';

/**
 * Guest-facing e-receipt (no auth). Token is HMAC-signed at checkout.
 */
@Controller('pos/public')
export class PosPublicReceiptController {
  constructor(private readonly posOrdersService: PosOrdersService) {}

  @Get('receipt')
  getReceipt(@Query('token') token?: string) {
    if (!token?.trim()) {
      throw new BadRequestException('Missing receipt token');
    }
    return this.posOrdersService.findPublicReceiptByToken(token.trim());
  }
}
