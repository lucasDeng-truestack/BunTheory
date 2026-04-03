import {
  BadRequestException,
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { UploadsService } from './uploads.service';

type MulterLikeFile = { originalname: string; mimetype?: string };

function isAllowedImageUpload(file: MulterLikeFile): boolean {
  const okExt = /\.(jpg|jpeg|png|webp|svg)$/i.test(file.originalname);
  const m = (file.mimetype ?? '').toLowerCase();
  const okMime =
    m === 'image/jpeg' ||
    m === 'image/jpg' ||
    m === 'image/png' ||
    m === 'image/webp' ||
    m === 'image/svg+xml';
  return okExt && okMime;
}

function isAllowedPaymentReceiptUpload(file: MulterLikeFile): boolean {
  const okExt = /\.(jpg|jpeg|png|webp|pdf)$/i.test(file.originalname);
  const m = (file.mimetype ?? '').toLowerCase();
  const okMime =
    m === 'image/jpeg' ||
    m === 'image/jpg' ||
    m === 'image/png' ||
    m === 'image/webp' ||
    m === 'application/pdf';
  return okExt && okMime;
}

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (_, file, cb) => {
        cb(null, isAllowedImageUpload(file));
      },
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'Image file is required or invalid. Use JPG, PNG, WebP or SVG up to 5MB.',
      );
    }
    const url = await this.uploadsService.saveFile(file);
    return { url };
  }

  /** Public: payment receipt before placing order (no admin login). */
  @Public()
  @Post('payment-receipt')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_, file, cb) => {
        cb(null, isAllowedPaymentReceiptUpload(file));
      },
    }),
  )
  async uploadPaymentReceipt(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'Receipt file is required or invalid. Use JPG, PNG, WebP or PDF up to 5MB.',
      );
    }
    const url = await this.uploadsService.saveFile(file);
    return { url };
  }
}
