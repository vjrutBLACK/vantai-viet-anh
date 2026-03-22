import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../../entities/employee.entity';
import { Commission } from '../../entities/commission.entity';
import { Trip } from '../../entities/trip.entity';
import { Transaction } from '../../entities/transaction.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { QueryEmployeeDto } from './dto/query-employee.dto';
import {
  QueryEmployeeTripsDto,
  QueryEmployeeSalaryHistoryDto,
  QueryEmployeeIncomeDto,
} from './dto/query-employee-history.dto';
import { SalariesService } from '../salaries/salaries.service';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(Commission)
    private commissionRepository: Repository<Commission>,
    @InjectRepository(Trip)
    private tripRepository: Repository<Trip>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private salariesService: SalariesService,
  ) {}

  async create(companyId: string, createEmployeeDto: CreateEmployeeDto) {
    const { name, fullName: fn, baseSalary, ...rest } = createEmployeeDto;
    const fullName = (fn ?? name)?.trim();
    if (!fullName) {
      throw new BadRequestException('Cần fullName hoặc name');
    }

    const employee = this.employeeRepository.create({
      ...rest,
      fullName,
      companyId,
      baseSalary: Number(baseSalary),
    });
    return await this.employeeRepository.save(employee);
  }

  async findAll(companyId: string, query: QueryEmployeeDto) {
    const { page = 1, limit = 20, search, position, status } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.employeeRepository
      .createQueryBuilder('employee')
      .where('employee.companyId = :companyId', { companyId });

    if (search) {
      queryBuilder.andWhere(
        '(employee.fullName ILIKE :search OR employee.employeeCode ILIKE :search OR employee.phone ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (position) {
      queryBuilder.andWhere('employee.position = :position', { position });
    }

    if (status) {
      queryBuilder.andWhere('employee.status = :status', { status });
    }

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(companyId: string, id: string) {
    const employee = await this.employeeRepository.findOne({
      where: { id, companyId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  async update(
    companyId: string,
    id: string,
    updateEmployeeDto: UpdateEmployeeDto,
  ) {
    const employee = await this.findOne(companyId, id);
    const { name, fullName: fn, baseSalary, ...rest } =
      updateEmployeeDto as any;

    if (fn !== undefined || name !== undefined) {
      const next = (fn ?? name)?.trim();
      if (next) employee.fullName = next;
    }

    if (baseSalary !== undefined) {
      employee.baseSalary = Number(baseSalary);
    }

    Object.assign(employee, rest);
    return await this.employeeRepository.save(employee);
  }

  async remove(companyId: string, id: string) {
    const employee = await this.findOne(companyId, id);
    employee.status = 'inactive';
    return await this.employeeRepository.save(employee);
  }

  async getDrivers(companyId: string, search?: string) {
    const queryBuilder = this.employeeRepository
      .createQueryBuilder('employee')
      .where('employee.companyId = :companyId', { companyId })
      .andWhere('employee.position = :position', { position: 'lái xe' })
      .andWhere('employee.status = :status', { status: 'active' });

    if (search) {
      queryBuilder.andWhere('employee.fullName ILIKE :search', {
        search: `%${search}%`,
      });
    }

    return await queryBuilder.getMany();
  }

  async getTripHistory(
    companyId: string,
    employeeId: string,
    query: QueryEmployeeTripsDto,
  ) {
    await this.findOne(companyId, employeeId);

    const {
      page = 1,
      limit = 20,
      fromDate,
      toDate,
    } = query;
    const skip = (page - 1) * limit;

    const qb = this.tripRepository
      .createQueryBuilder('trip')
      .leftJoinAndSelect('trip.vehicle', 'vehicle')
      .leftJoinAndSelect('trip.customer', 'customer')
      .where('trip.companyId = :companyId', { companyId })
      .andWhere('trip.driverId = :employeeId', { employeeId })
      .andWhere('trip.status != :cancelled', { cancelled: 'cancelled' });

    if (fromDate && toDate) {
      qb.andWhere('trip.tripDate BETWEEN :fromDate AND :toDate', {
        fromDate,
        toDate,
      });
    } else if (fromDate) {
      qb.andWhere('trip.tripDate >= :fromDate', { fromDate });
    } else if (toDate) {
      qb.andWhere('trip.tripDate <= :toDate', { toDate });
    }

    qb.orderBy('trip.tripDate', 'DESC');

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** Option A: dynamic (trips + salary_configs) | Option B: transactions category SALARY */
  async getSalaryHistory(
    companyId: string,
    employeeId: string,
    q: QueryEmployeeSalaryHistoryDto,
  ) {
    await this.findOne(companyId, employeeId);
    const { fromDate, toDate, source = 'dynamic' } = q;

    if (source === 'transactions') {
      const qb = this.transactionRepository
        .createQueryBuilder('t')
        .where('t.companyId = :companyId', { companyId })
        .andWhere('t.employeeId = :employeeId', { employeeId })
        .andWhere('t.transactionDate BETWEEN :from AND :to', {
          from: fromDate,
          to: toDate,
        })
        .andWhere('t.transactionType = :exp', { exp: 'expense' })
        .andWhere(
          '(UPPER(TRIM(t.category)) = :s OR LOWER(TRIM(t.category)) IN (:...c))',
          { s: 'SALARY', c: ['salary', 'payroll'] },
        )
        .orderBy('t.transactionDate', 'DESC');

      const rows = await qb.getMany();
      const totalAmount = rows.reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        source: 'transactions',
        fromDate,
        toDate,
        totalAmount,
        items: rows.map((t) => ({
          id: t.id,
          amount: Number(t.amount),
          date: t.transactionDate,
          description: t.description ?? null,
          category: t.category,
        })),
      };
    }

    const data = await this.salariesService.getReport(companyId, {
      fromDate,
      toDate,
      employeeId,
    });

    return { source: 'dynamic', fromDate, toDate, data };
  }

  async getIncome(
    companyId: string,
    employeeId: string,
    q: QueryEmployeeIncomeDto,
  ) {
    await this.findOne(companyId, employeeId);
    const { fromDate, toDate } = q;
    const rows = await this.salariesService.getReport(companyId, {
      fromDate,
      toDate,
      employeeId,
    });
    const row = rows[0];
    return {
      totalTrips: row?.totalTrips ?? 0,
      totalRevenue: row?.totalRevenue ?? 0,
      salary: row?.totalSalary ?? 0,
    };
  }

  async getCommissionByMonth(
    companyId: string,
    employeeId: string,
    start?: string, // YYYY-MM
    end?: string, // YYYY-MM
  ) {
    await this.findOne(companyId, employeeId);

    const qb = this.commissionRepository
      .createQueryBuilder('c')
      .select('c.period', 'period')
      .addSelect('COALESCE(SUM(c.amount), 0)', 'totalAmount')
      .addSelect('COUNT(c.id)', 'totalRecords')
      .where('c.companyId = :companyId', { companyId })
      .andWhere('c.employeeId = :employeeId', { employeeId });

    if (start) qb.andWhere('c.period >= :start', { start });
    if (end) qb.andWhere('c.period <= :end', { end });

    const rows = await qb.groupBy('c.period').orderBy('c.period', 'DESC').getRawMany<{
      period: string;
      totalAmount: string;
      totalRecords: string;
    }>();

    return rows.map((r) => ({
      period: r.period,
      totalAmount: parseFloat(r.totalAmount || '0'),
      totalRecords: parseInt(r.totalRecords || '0', 10),
    }));
  }
}
