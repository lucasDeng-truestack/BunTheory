import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminPasswordDto } from './dto/update-admin-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const admin = await this.prisma.admin.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, admin.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: admin.id, email: admin.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      admin: {
        id: admin.id,
        email: admin.email,
      },
    };
  }

  async listAdmins() {
    return this.prisma.admin.findMany({
      orderBy: [{ createdAt: 'asc' }, { email: 'asc' }],
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });
  }

  async createAdmin(dto: CreateAdminDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.admin.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('An admin with this email already exists');
    }

    const password = await bcrypt.hash(dto.password, 10);
    return this.prisma.admin.create({
      data: {
        email,
        password,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });
  }

  async updateAdminPassword(adminId: string, dto: UpdateAdminPasswordDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const existing = await this.prisma.admin.findUnique({
      where: { id: adminId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Admin not found');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    return this.prisma.admin.update({
      where: { id: adminId },
      data: { password: hashed },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });
  }
}
