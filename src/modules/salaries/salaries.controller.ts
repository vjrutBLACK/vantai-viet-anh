import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SalariesService } from './salaries.service';
import { QuerySalaryDto } from './dto/query-salary.dto';
import { UpsertSalaryConfigDto } from './dto/upsert-salary-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyId } from '../../common/decorators/company-id.decorator';

@Controller('salaries')
@UseGuards(JwtAuthGuard)
export class SalariesController {
  constructor(private readonly salariesService: SalariesService) {}

  @Get('export')
  async export(
    @CompanyId() companyId: string,
    @Query() query: QuerySalaryDto,
  ) {
    const { buffer, fileName } = await this.salariesService.exportExcel(
      companyId,
      query,
    );
    return {
      success: true,
      data: {
        buffer: buffer.toString('base64'),
        fileName,
      },
    };
  }

  @Get('config/:employeeId')
  async getConfig(
    @CompanyId() companyId: string,
    @Param('employeeId') employeeId: string,
  ) {
    const data = await this.salariesService.getConfig(companyId, employeeId);
    return { success: true, data };
  }

  @Put('config/:employeeId')
  async upsertConfig(
    @CompanyId() companyId: string,
    @Param('employeeId') employeeId: string,
    @Body() dto: UpsertSalaryConfigDto,
  ) {
    const data = await this.salariesService.upsertConfig(
      companyId,
      employeeId,
      dto,
    );
    return { success: true, data };
  }

  @Get()
  async report(
    @CompanyId() companyId: string,
    @Query() query: QuerySalaryDto,
  ) {
    const data = await this.salariesService.getReport(companyId, query);
    return { success: true, data };
  }
}
