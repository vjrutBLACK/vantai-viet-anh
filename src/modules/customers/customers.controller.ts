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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyId } from '../../common/decorators/company-id.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  async create(
    @CompanyId() companyId: string,
    @Body() createCustomerDto: CreateCustomerDto,
  ) {
    const data = await this.customersService.create(companyId, createCustomerDto);
    return { success: true, data };
  }

  @Get()
  async findAll(@CompanyId() companyId: string, @Query() query: QueryCustomerDto) {
    const result = await this.customersService.findAll(companyId, query);
    return { success: true, ...result };
  }

  @Get(':id')
  async findOne(@CompanyId() companyId: string, @Param('id') id: string) {
    const data = await this.customersService.findOne(companyId, id);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    const data = await this.customersService.update(
      companyId,
      id,
      updateCustomerDto,
    );
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@CompanyId() companyId: string, @Param('id') id: string) {
    await this.customersService.remove(companyId, id);
    return { success: true, message: 'Customer deleted successfully' };
  }
}
