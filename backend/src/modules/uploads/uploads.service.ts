import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private uploadDir: string;
  private readonly bucket = process.env.S3_BUCKET?.trim() ?? '';
  private readonly publicUrl = (process.env.PUBLIC_URL || 'http://localhost:3001/uploads')
    .trim()
    .replace(/\/+$/, '');
  private readonly s3Client: S3Client | null;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    const endpoint = process.env.S3_ENDPOINT?.trim();
    const accessKeyId = process.env.S3_ACCESS_KEY?.trim();
    const secretAccessKey = process.env.S3_SECRET_KEY?.trim();

    if (endpoint && accessKeyId && secretAccessKey && this.bucket) {
      this.s3Client = new S3Client({
        region: process.env.S3_REGION?.trim() || 'auto',
        endpoint,
        forcePathStyle: true,
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      return;
    }

    this.s3Client = null;
  }

  private getPublicUrl(filename: string): string {
    return `${this.publicUrl}/${filename}`;
  }

  private getFilename(file: Express.Multer.File): string {
    const ext = path.extname(file.originalname) || '.jpg';
    return `${Date.now()}-${Math.random().toString(36).slice(2)}${ext.toLowerCase()}`;
  }

  private async saveToObjectStorage(
    file: Express.Multer.File,
    filename: string,
  ): Promise<string> {
    if (!this.s3Client) {
      throw new Error('S3 client is not configured');
    }

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: filename,
          Body: file.buffer,
          ContentType: file.mimetype || 'application/octet-stream',
        }),
      );

      return this.getPublicUrl(filename);
    } catch (error) {
      this.logger.error(
        `R2 upload failed for ${filename}: ${error instanceof Error ? error.message : error}`,
      );
      throw new InternalServerErrorException('Could not upload file');
    }
  }

  async saveFile(file: Express.Multer.File): Promise<string> {
    const filename = this.getFilename(file);

    if (this.s3Client) {
      return this.saveToObjectStorage(file, filename);
    }

    const filepath = path.join(this.uploadDir, filename);
    fs.writeFileSync(filepath, file.buffer);
    return this.getPublicUrl(filename);
  }
}
