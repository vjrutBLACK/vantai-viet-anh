import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../../entities/employee.entity';
import { Trip } from '../../entities/trip.entity';
import { SalaryConfig } from '../../entities/salary-config.entity';
import { SalariesService } from './salaries.service';
import { SalariesController } from './salaries.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, Trip, SalaryConfig])],
  controllers: [SalariesController],
  providers: [SalariesService],
  exports: [SalariesService],
})
export class SalariesModule {}
