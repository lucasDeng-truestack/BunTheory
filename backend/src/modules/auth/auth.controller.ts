import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginCodeRequestDto, LoginCodeVerifyDto } from './dto/login-code.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminPasswordDto } from './dto/update-admin-password.dto';
import { UpdateAdminDisplayNameDto } from './dto/update-admin-display-name.dto';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @SkipThrottle({ day: true })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** Admin sign-in by emailed code, step 1: send the code (only staff emails get one). */
  @Post('login/code')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @SkipThrottle({ day: true })
  sendLoginCode(@Body() dto: LoginCodeRequestDto) {
    return this.authService.sendLoginCode(dto);
  }

  /** Admin sign-in by emailed code, step 2: the code for a session, like POST /auth/login. */
  @Post('login/code/verify')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @SkipThrottle({ day: true })
  loginWithCode(@Body() dto: LoginCodeVerifyDto) {
    return this.authService.loginWithCode(dto);
  }

  @Get('admins')
  @UseGuards(AdminAuthGuard)
  async listAdmins() {
    return this.authService.listAdmins();
  }

  @Post('admins')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  async createAdmin(@Body() dto: CreateAdminDto) {
    return this.authService.createAdmin(dto);
  }

  @Patch('admins/:id/display-name')
  @UseGuards(AdminAuthGuard)
  async updateAdminDisplayName(
    @Param('id') id: string,
    @Body() dto: UpdateAdminDisplayNameDto,
    @Req() req: Request,
  ) {
    return this.authService.updateAdminDisplayName(req.user!, id, dto);
  }

  @Patch('admins/:id/password')
  @UseGuards(AdminAuthGuard)
  async updateAdminPassword(
    @Param('id') id: string,
    @Body() dto: UpdateAdminPasswordDto,
    @Req() req: Request,
  ) {
    return this.authService.updateAdminPassword(req.user!, id, dto);
  }
}
