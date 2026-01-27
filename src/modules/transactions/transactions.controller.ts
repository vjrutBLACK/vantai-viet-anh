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
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyId } from '../../common/decorators/company-id.decorator';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  async create(
    @CompanyId() companyId: string,
    @Body() createTransactionDto: CreateTransactionDto,
  ) {
    const data = await this.transactionsService.create(
      companyId,
      createTransactionDto,
    );
    return { success: true, data };
  }

  @Get()
  async findAll(
    @CompanyId() companyId: string,
    @Query() query: QueryTransactionDto,
  ) {
    const result = await this.transactionsService.findAll(companyId, query);
    return { success: true, ...result };
  }

  @Get('stats')
  async getStats(
    @CompanyId() companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const data = await this.transactionsService.getStats(
      companyId,
      startDate,
      endDate,
    );
    return { success: true, data };
  }

  @Get('balance')
  async getBalance(@CompanyId() companyId: string) {
    const data = await this.transactionsService.getBalance(companyId);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@CompanyId() companyId: string, @Param('id') id: string) {
    const data = await this.transactionsService.findOne(companyId, id);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ) {
    const data = await this.transactionsService.update(
      companyId,
      id,
      updateTransactionDto,
    );
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@CompanyId() companyId: string, @Param('id') id: string) {
    await this.transactionsService.remove(companyId, id);
    return { success: true, message: 'Transaction deleted successfully' };
  }
}
