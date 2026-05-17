import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PosReportsService } from './pos-reports.service';

@Controller('pos/reports')
@UseGuards(JwtAuthGuard)
export class PosReportsController {
  constructor(private readonly posReportsService: PosReportsService) {}

  @Get('daily')
  getDailySummary(@Query('date') date?: string) {
    return this.posReportsService.getDailySummary(date);
  }

  @Get('dashboard')
  getDashboardSummary() {
    return this.posReportsService.getDashboardSummary();
  }
}
