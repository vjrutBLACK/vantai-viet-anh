import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyId } from '../../common/decorators/company-id.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  async getDashboard(
    @CompanyId() companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const data = await this.reportsService.getDashboard(
      companyId,
      startDate,
      endDate,
    );
    return { success: true, data };
  }

  @Get('vehicles')
  async getVehiclesReport(
    @CompanyId() companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const data = await this.reportsService.getVehiclesReport(
      companyId,
      startDate,
      endDate,
    );
    return { success: true, data };
  }

  @Get('drivers')
  async getDriversReport(
    @CompanyId() companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const data = await this.reportsService.getDriversReport(
      companyId,
      startDate,
      endDate,
    );
    return { success: true, data };
  }

  @Get('customers')
  async getCustomersReport(
    @CompanyId() companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const data = await this.reportsService.getCustomersReport(
      companyId,
      startDate,
      endDate,
    );
    return { success: true, data };
  }

  @Get('profit-loss')
  async getProfitLossReport(
    @CompanyId() companyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('groupBy') groupBy?: string,
  ) {
    const data = await this.reportsService.getProfitLossReport(
      companyId,
      startDate,
      endDate,
      groupBy,
    );
    return { success: true, data };
  }
}
