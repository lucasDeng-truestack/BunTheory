import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminPasswordDto } from './dto/update-admin-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('admins')
  @UseGuards(JwtAuthGuard)
  async listAdmins() {
    return this.authService.listAdmins();
  }

  @Post('admins')
  @UseGuards(JwtAuthGuard)
  async createAdmin(@Body() dto: CreateAdminDto) {
    return this.authService.createAdmin(dto);
  }

  @Patch('admins/:id/password')
  @UseGuards(JwtAuthGuard)
  async updateAdminPassword(
    @Param('id') id: string,
    @Body() dto: UpdateAdminPasswordDto,
  ) {
    return this.authService.updateAdminPassword(id, dto);
  }
}
