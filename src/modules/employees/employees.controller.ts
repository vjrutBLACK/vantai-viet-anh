import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { QueryEmployeeDto } from './dto/query-employee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyId } from '../../common/decorators/company-id.decorator';

@Controller('employees')
@UseGuards(JwtAuthGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  async create(
    @CompanyId() companyId: string,
    @Body() createEmployeeDto: CreateEmployeeDto,
  ) {
    const data = await this.employeesService.create(companyId, createEmployeeDto);
    return { success: true, data };
  }

  @Get()
  async findAll(@CompanyId() companyId: string, @Query() query: QueryEmployeeDto) {
    const result = await this.employeesService.findAll(companyId, query);
    return { success: true, ...result };
  }

  @Get('drivers')
  async getDrivers(
    @CompanyId() companyId: string,
    @Query('search') search?: string,
  ) {
    const data = await this.employeesService.getDrivers(companyId, search);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@CompanyId() companyId: string, @Param('id') id: string) {
    const data = await this.employeesService.findOne(companyId, id);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    const data = await this.employeesService.update(
      companyId,
      id,
      updateEmployeeDto,
    );
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@CompanyId() companyId: string, @Param('id') id: string) {
    await this.employeesService.remove(companyId, id);
    return { success: true, message: 'Employee deleted successfully' };
  }
}
