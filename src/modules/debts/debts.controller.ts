import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DebtsService } from './debts.service';
import { CreateDebtDto } from './dto/create-debt.dto';
import { QueryDebtDto } from './dto/query-debt.dto';
import { PayDebtDto } from './dto/pay-debt.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyId } from '../../common/decorators/company-id.decorator';

@Controller('debts')
@UseGuards(JwtAuthGuard)
export class DebtsController {
  constructor(private readonly debtsService: DebtsService) {}

  @Post()
  async create(
    @CompanyId() companyId: string,
    @Body() dto: CreateDebtDto,
  ) {
    const data = await this.debtsService.create(companyId, dto);
    return { success: true, data };
  }

  @Get()
  async findAll(@CompanyId() companyId: string, @Query() query: QueryDebtDto) {
    const result = await this.debtsService.findAll(companyId, query);
    return { success: true, ...result };
  }

  @Get(':id')
  async findOne(@CompanyId() companyId: string, @Param('id') id: string) {
    const data = await this.debtsService.findOne(companyId, id);
    return { success: true, data };
  }

  @Post(':id/pay')
  async pay(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: PayDebtDto,
  ) {
    const data = await this.debtsService.pay(companyId, id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@CompanyId() companyId: string, @Param('id') id: string) {
    await this.debtsService.remove(companyId, id);
    return { success: true, message: 'Debt deleted' };
  }
}
