import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Trip } from '../../entities/trip.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { Employee } from '../../entities/employee.entity';
import { Customer } from '../../entities/customer.entity';
import { Transaction } from '../../entities/transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trip, Vehicle, Employee, Customer, Transaction]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
