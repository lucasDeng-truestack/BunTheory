import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { CateringController } from './catering.controller';
import { CateringAdminController } from './catering-admin.controller';
import { CateringService } from './catering.service';
import { CateringContentService } from './catering-content.service';

@Module({
  imports: [EmailModule],
  controllers: [CateringController, CateringAdminController],
  providers: [CateringService, CateringContentService],
})
export class CateringModule {}
