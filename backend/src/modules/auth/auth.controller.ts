import {
  Body,
  Controller,
  Get,
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
