import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyId } from '../../common/decorators/company-id.decorator';

@Controller('suppliers')
@UseGuards(JwtAuthGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  async create(
    @CompanyId() companyId: string,
    @Body() dto: CreateSupplierDto,
  ) {
    const data = await this.suppliersService.create(companyId, dto);
    return { success: true, data };
  }

  @Get()
  async findAll(@CompanyId() companyId: string) {
    const data = await this.suppliersService.findAll(companyId);
    return { success: true, data };
  }
}
