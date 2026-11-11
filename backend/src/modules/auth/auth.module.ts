import { Global, Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailModule } from '../email/email.module';
import { EmailService } from '../email/email.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { BETTER_AUTH, createAuth } from './better-auth';

// Global so AdminAuthGuard / CustomerAuthGuard can inject BETTER_AUTH from any module.
@Global()
@Module({
  imports: [EmailModule],
  controllers: [AuthController],
  providers: [
    {
      provide: BETTER_AUTH,
      inject: [PrismaService, EmailService],
      useFactory: createAuth,
    },
    AuthService,
  ],
  exports: [BETTER_AUTH, AuthService],
})
export class AuthModule {}
