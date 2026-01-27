import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExcelService } from '../excel.service';
import { ImportLog } from '../../../entities/import-log.entity';

@Processor('trip-import')
export class TripImportProcessor {
  constructor(
    private excelService: ExcelService,
    @InjectRepository(ImportLog)
    private importLogRepository: Repository<ImportLog>,
  ) {}

  @Process()
  async handleImport(job: Job) {
    const { companyId, file, fileName, sheetName, overwrite } = job.data;

    // Create import log
    const importLog = this.importLogRepository.create({
      companyId,
      fileName,
      fileSize: file.length,
      status: 'processing',
      startedAt: new Date(),
    });
    await this.importLogRepository.save(importLog);

    try {
      // Import trips
      const results = await this.excelService.importFromExcel(
        companyId,
        file,
        sheetName,
        overwrite,
      );

      // Update import log
      importLog.totalRows = results.success.length + results.errors.length;
      importLog.successRows = results.success.length;
      importLog.errorRows = results.errors.length;
      importLog.status = 'completed';
      importLog.completedAt = new Date();

      if (results.errors.length > 0) {
        importLog.errorMessage = JSON.stringify(results.errors.slice(0, 10)); // First 10 errors
      }

      await this.importLogRepository.save(importLog);

      return {
        importLogId: importLog.id,
        ...results,
      };
    } catch (error) {
      importLog.status = 'failed';
      importLog.errorMessage = error.message;
      importLog.completedAt = new Date();
      await this.importLogRepository.save(importLog);

      throw error;
    }
  }
}
