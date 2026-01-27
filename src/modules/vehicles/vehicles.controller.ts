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
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { QueryVehicleDto } from './dto/query-vehicle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyId } from '../../common/decorators/company-id.decorator';

@Controller('vehicles')
@UseGuards(JwtAuthGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  async create(
    @CompanyId() companyId: string,
    @Body() createVehicleDto: CreateVehicleDto,
  ) {
    const data = await this.vehiclesService.create(companyId, createVehicleDto);
    return { success: true, data };
  }

  @Get()
  async findAll(@CompanyId() companyId: string, @Query() query: QueryVehicleDto) {
    const result = await this.vehiclesService.findAll(companyId, query);
    return { success: true, ...result };
  }

  @Get('stats')
  async getStats(@CompanyId() companyId: string) {
    const data = await this.vehiclesService.getStats(companyId);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@CompanyId() companyId: string, @Param('id') id: string) {
    const data = await this.vehiclesService.findOne(companyId, id);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
  ) {
    const data = await this.vehiclesService.update(
      companyId,
      id,
      updateVehicleDto,
    );
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@CompanyId() companyId: string, @Param('id') id: string) {
    await this.vehiclesService.remove(companyId, id);
    return { success: true, message: 'Vehicle deleted successfully' };
  }
}
