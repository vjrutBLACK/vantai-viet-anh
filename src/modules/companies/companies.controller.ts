import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('companies')
@UseGuards(JwtAuthGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    // Ensure user can only access their own company
    if (user.companyId !== id) {
      throw new Error('Forbidden');
    }
    const data = await this.companiesService.findOne(id);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
    @CurrentUser() user: any,
  ) {
    // Ensure user can only update their own company
    if (user.companyId !== id) {
      throw new Error('Forbidden');
    }
    const data = await this.companiesService.update(id, updateCompanyDto);
    return { success: true, data };
  }
}
