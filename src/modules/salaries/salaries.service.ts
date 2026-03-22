import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { Employee } from '../../entities/employee.entity';
import { Trip } from '../../entities/trip.entity';
import { SalaryConfig } from '../../entities/salary-config.entity';
import { QuerySalaryDto } from './dto/query-salary.dto';
import { UpsertSalaryConfigDto } from './dto/upsert-salary-config.dto';

export interface SalaryReportRow {
  employeeId: string;
  name: string;
  position: string | null;
  totalTrips: number;
  totalRevenue: number;
  baseSalary: number;
  tripSalary: number;
  revenueBonus: number;
  totalSalary: number;
}

@Injectable()
export class SalariesService {
  constructor(
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(Trip)
    private tripRepository: Repository<Trip>,
    @InjectRepository(SalaryConfig)
    private salaryConfigRepository: Repository<SalaryConfig>,
  ) {}

  private resolveBaseSalary(
    employee: Employee,
    config: SalaryConfig | undefined,
  ): number {
    if (config?.baseSalary != null) {
      return Number(config.baseSalary);
    }
    return Number(employee.baseSalary ?? 0);
  }

  private resolvePerTrip(config: SalaryConfig | undefined): number {
    return Number(config?.perTrip ?? 0);
  }

  /** revenuePercent: 5 = 5% */
  private resolveRevenuePercent(config: SalaryConfig | undefined): number {
    return Number(config?.revenuePercent ?? 0);
  }

  async getReport(
    companyId: string,
    query: QuerySalaryDto,
  ): Promise<SalaryReportRow[]> {
    const { fromDate, toDate, employeeId, role = 'all' } = query;

    const qb = this.employeeRepository
      .createQueryBuilder('e')
      .where('e.companyId = :companyId', { companyId })
      .andWhere('e.status = :active', { active: 'active' });

    if (employeeId) {
      qb.andWhere('e.id = :employeeId', { employeeId });
    }

    if (role === 'driver') {
      qb.andWhere('e.position = :pos', { pos: 'lái xe' });
    } else if (role === 'operator') {
      qb.andWhere('e.position = :pos', { pos: 'phụ xe' });
    }

    const employees = await qb.orderBy('e.fullName', 'ASC').getMany();

    if (employees.length === 0) return [];

    const ids = employees.map((e) => e.id);

    const aggRows = await this.tripRepository
      .createQueryBuilder('t')
      .select('t.driverId', 'driverId')
      .addSelect('COUNT(*)', 'totalTrips')
      .addSelect('COALESCE(SUM(t.revenue), 0)', 'totalRevenue')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.tripDate BETWEEN :fromDate AND :toDate', { fromDate, toDate })
      .andWhere('t.status != :cancelled', { cancelled: 'cancelled' })
      .andWhere('t.driverId IN (:...ids)', { ids })
      .groupBy('t.driverId')
      .getRawMany();

    const aggMap = new Map<
      string,
      { totalTrips: number; totalRevenue: number }
    >();
    for (const r of aggRows) {
      aggMap.set(r.driverId, {
        totalTrips: parseInt(r.totalTrips, 10) || 0,
        totalRevenue: parseFloat(r.totalRevenue) || 0,
      });
    }

    const configs = await this.salaryConfigRepository.find({
      where: { companyId, employeeId: In(ids) },
    });
    const configByEmp = new Map(configs.map((c) => [c.employeeId, c]));

    return employees.map((emp) => {
      const agg = aggMap.get(emp.id) ?? {
        totalTrips: 0,
        totalRevenue: 0,
      };
      const cfg = configByEmp.get(emp.id) as SalaryConfig | undefined;

      const baseSalary = this.resolveBaseSalary(emp, cfg);
      const perTrip = this.resolvePerTrip(cfg);
      const pct = this.resolveRevenuePercent(cfg);

      const tripSalary = agg.totalTrips * perTrip;
      const revenueBonus = (agg.totalRevenue * pct) / 100;
      const totalSalary = baseSalary + tripSalary + revenueBonus;

      return {
        employeeId: emp.id,
        name: emp.fullName,
        position: emp.position ?? null,
        totalTrips: agg.totalTrips,
        totalRevenue: agg.totalRevenue,
        baseSalary,
        tripSalary,
        revenueBonus,
        totalSalary,
      };
    });
  }

  async exportExcel(
    companyId: string,
    query: QuerySalaryDto,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const rows = await this.getReport(companyId, query);
    const wsData: (string | number)[][] = [
      [
        'Nhân viên',
        'Vị trí',
        'Số chuyến',
        'Doanh thu',
        'Lương cứng',
        'Lương chuyến',
        'Thưởng doanh thu',
        'Tổng lương',
      ],
    ];

    for (const r of rows) {
      wsData.push([
        r.name,
        r.position ?? '',
        r.totalTrips,
        r.totalRevenue,
        r.baseSalary,
        r.tripSalary,
        r.revenueBonus,
        r.totalSalary,
      ]);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Lương');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    const fileName = `salary_${query.fromDate}_${query.toDate}.xlsx`;
    return { buffer, fileName };
  }

  async getConfig(companyId: string, employeeId: string) {
    const emp = await this.employeeRepository.findOne({
      where: { id: employeeId, companyId },
    });
    if (!emp) throw new NotFoundException('Employee not found');

    let cfg = await this.salaryConfigRepository.findOne({
      where: { companyId, employeeId },
    });

    if (!cfg) {
      return {
        employeeId,
        baseSalary: null,
        perTrip: 0,
        revenuePercent: 0,
        effectiveBaseSalary: Number(emp.baseSalary ?? 0),
      };
    }

    return {
      employeeId,
      baseSalary: cfg.baseSalary != null ? Number(cfg.baseSalary) : null,
      perTrip: Number(cfg.perTrip),
      revenuePercent: Number(cfg.revenuePercent),
      effectiveBaseSalary:
        cfg.baseSalary != null
          ? Number(cfg.baseSalary)
          : Number(emp.baseSalary ?? 0),
    };
  }

  async upsertConfig(
    companyId: string,
    employeeId: string,
    dto: UpsertSalaryConfigDto,
  ) {
    const emp = await this.employeeRepository.findOne({
      where: { id: employeeId, companyId },
    });
    if (!emp) throw new NotFoundException('Employee not found');

    let cfg = await this.salaryConfigRepository.findOne({
      where: { companyId, employeeId },
    });

    if (!cfg) {
      cfg = this.salaryConfigRepository.create({
        companyId,
        employeeId,
        baseSalary: null,
        perTrip: 0,
        revenuePercent: 0,
      });
    }

    if (dto.baseSalary !== undefined) {
      cfg.baseSalary = dto.baseSalary;
    }
    if (dto.perTrip !== undefined) {
      cfg.perTrip = dto.perTrip;
    }
    if (dto.revenuePercent !== undefined) {
      cfg.revenuePercent = dto.revenuePercent;
    }

    await this.salaryConfigRepository.save(cfg);
    return this.getConfig(companyId, employeeId);
  }
}
