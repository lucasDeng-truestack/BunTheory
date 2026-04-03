import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { CreateAdminDto } from './dto/create-admin.dto';

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
}
