import { Module } from '@nestjs/common';
import { EmailService } from './email.service';

// PrismaModule is @Global, so PrismaService is injectable without importing it here.
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
