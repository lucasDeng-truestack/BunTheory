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

  @Get('summary')
  getPeriodSummary(@Query('range') range?: string) {
    return this.posReportsService.getPeriodSummary(range);
  }

  @Get('dashboard')
  getDashboardSummary() {
    return this.posReportsService.getDashboardSummary();
  }

  @Get('customers')
  getCustomerSummaries(@Query('range') range?: string) {
    return this.posReportsService.getCustomerSummaries(range);
  }

  @Get('customer-orders')
  getCustomerOrders(
    @Query('range') range: string | undefined,
    @Query('customerName') customerName: string,
  ) {
    return this.posReportsService.getCustomerOrders(range, customerName ?? '');
  }
}
