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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { TripsService } from './trips.service';
import { ExcelService } from './excel.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { QueryTripDto } from './dto/query-trip.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyId } from '../../common/decorators/company-id.decorator';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Controller('trips')
@UseGuards(JwtAuthGuard)
export class TripsController {
  constructor(
    private readonly tripsService: TripsService,
    private readonly excelService: ExcelService,
    @InjectQueue('trip-import') private tripImportQueue: Queue,
  ) {}

  @Post()
  async create(
    @CompanyId() companyId: string,
    @Body() createTripDto: CreateTripDto,
  ) {
    const data = await this.tripsService.create(companyId, createTripDto);
    return { success: true, data };
  }

  @Get()
  async findAll(@CompanyId() companyId: string, @Query() query: QueryTripDto) {
    const result = await this.tripsService.findAll(companyId, query);
    return { success: true, ...result };
  }

  @Get('stats')
  async getStats(
    @CompanyId() companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const data = await this.tripsService.getStats(companyId, startDate, endDate);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@CompanyId() companyId: string, @Param('id') id: string) {
    const data = await this.tripsService.findOne(companyId, id);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() updateTripDto: UpdateTripDto,
  ) {
    const data = await this.tripsService.update(companyId, id, updateTripDto);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@CompanyId() companyId: string, @Param('id') id: string) {
    await this.tripsService.remove(companyId, id);
    return { success: true, message: 'Trip deleted successfully' };
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async import(
    @CompanyId() companyId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('sheetName') sheetName?: string,
    @Body('overwrite') overwrite?: string | boolean,
  ) {
    if (!file) {
      throw new Error('File is required');
    }

    // Add job to queue
    const job = await this.tripImportQueue.add({
      companyId,
      file: file.buffer,
      fileName: file.originalname,
      sheetName,
      overwrite: overwrite === 'true' || overwrite === true,
    });

    return {
      success: true,
      data: {
        importId: job.id.toString(),
        status: 'processing',
        message: 'Import đã được đưa vào queue',
      },
    };
  }

  @Get('import/:importId')
  async getImportStatus(@Param('importId') importId: string) {
    const job = await this.tripImportQueue.getJob(importId);
    if (!job) {
      throw new Error('Import job not found');
    }

    const state = await job.getState();
    const progress = job.progress;

    return {
      success: true,
      data: {
        id: importId,
        status: state,
        progress,
        result: job.returnvalue,
      },
    };
  }

  @Post('import/validate')
  @UseInterceptors(FileInterceptor('file'))
  async validateImport(
    @CompanyId() companyId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('sheetName') sheetName?: string,
  ) {
    if (!file) {
      throw new Error('File is required');
    }

    const result = await this.excelService.validateExcel(
      companyId,
      file.buffer,
      sheetName,
    );

    return { success: true, data: result };
  }

  @Get('export')
  async export(
    @CompanyId() companyId: string,
    @Query() query: QueryTripDto,
  ) {
    const trips = await this.tripsService.findAll(companyId, {
      ...query,
      limit: 10000, // Export all
    });

    const buffer = await this.excelService.exportToExcel(companyId, trips.data);

    return {
      success: true,
      data: {
        buffer: buffer.toString('base64'),
        fileName: `trips_export_${new Date().toISOString().split('T')[0]}.xlsx`,
      },
    };
  }
}
