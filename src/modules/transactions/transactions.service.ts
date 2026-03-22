import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { Trip } from '../../entities/trip.entity';
import { Transaction } from '../../entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';
import {
  normalizeCategoryToCanonical,
  normalizeTypeToDb,
  typeDbToApi,
  validateTypeCategoryPair,
} from './transaction-finance.helpers';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Trip)
    private tripRepository: Repository<Trip>,
  ) {}

  /**
   * Đồng bộ Thu chi: khi chuyến hoàn thành, tạo 1 dòng INCOME + TRIP_PAYMENT (doanh thu chuyến) nếu chưa có.
   * Trước đây chuyến và transactions tách nhau nên màn Thu chi trống dù đã có trip completed.
   */
  async createIncomeFromCompletedTripIfAbsent(
    companyId: string,
    trip: Trip,
  ): Promise<void> {
    const existing = await this.transactionRepository.findOne({
      where: {
        companyId,
        tripId: trip.id,
        transactionType: 'income',
      },
    });
    if (existing) return;

    const revenue = Number(trip.revenue ?? 0);
    if (revenue <= 0) return;

    const transactionDate = this.normalizeDateInput(trip.tripDate);
    if (!transactionDate) {
      this.logger.warn(
        `Skip trip income tx: no date for trip ${trip.id}`,
      );
      return;
    }

    try {
      await this.create(companyId, {
        transactionDate,
        transactionType: 'INCOME',
        category: 'TRIP_PAYMENT',
        amount: revenue,
        tripId: trip.id,
        customerId: trip.customerId,
        vehicleId: trip.vehicleId,
        description: `Doanh thu chuyến ${trip.tripCode ?? trip.id}`,
        status: 'completed',
      });
    } catch (e) {
      this.logger.warn(
        `Không tạo giao dịch thu cho chuyến ${trip.id}: ${(e as Error).message}`,
      );
    }
  }

  /**
   * Đồng bộ: tạo transaction INCOME từ tất cả chuyến hoàn thành (revenue > 0) chưa có giao dịch.
   * Dùng khi có chuyến completed nhưng màn Thu chi trống (trips tạo qua luồng cũ / chưa sync).
   */
  async syncFromCompletedTrips(companyId: string): Promise<{ created: number }> {
    const trips = await this.tripRepository.find({
      where: { companyId, status: 'completed' },
      select: ['id', 'tripCode', 'tripDate', 'revenue', 'customerId', 'vehicleId', 'companyId'],
    });

    let created = 0;
    for (const trip of trips) {
      const revenue = Number(trip.revenue ?? 0);
      if (revenue <= 0) continue;

      const existing = await this.transactionRepository.findOne({
        where: {
          companyId,
          tripId: trip.id,
          transactionType: 'income',
        },
      });
      if (existing) continue;

      const transactionDate = this.normalizeDateInput(trip.tripDate);
      if (!transactionDate) {
        this.logger.warn(`Skip trip ${trip.id}: no date`);
        continue;
      }

      try {
        await this.create(companyId, {
          transactionDate,
          transactionType: 'INCOME',
          category: 'TRIP_PAYMENT',
          amount: revenue,
          tripId: trip.id,
          customerId: trip.customerId,
          vehicleId: trip.vehicleId,
          description: `Doanh thu chuyến ${trip.tripCode ?? trip.id}`,
          status: 'completed',
        });
        created++;
      } catch (e) {
        this.logger.warn(
          `Không tạo giao dịch cho chuyến ${trip.id}: ${(e as Error).message}`,
        );
      }
    }

    return { created };
  }

  private normalizeDateInput(raw: unknown): string | undefined {
    if (raw == null) return undefined;
    if (typeof raw === 'string') return raw.split('T')[0];
    if (raw instanceof Date) return raw.toISOString().split('T')[0];
    return String(raw).split('T')[0];
  }

  private parseCreatePayload(dto: CreateTransactionDto) {
    const d = dto as CreateTransactionDto & {
      date?: string;
      type?: string;
      note?: string;
    };

    const transactionDate = this.normalizeDateInput(
      d.transactionDate ?? d.date,
    );
    if (!transactionDate) {
      throw new BadRequestException('Cần transactionDate hoặc date');
    }

    const rawType = d.transactionType ?? d.type;
    const transactionType = normalizeTypeToDb(rawType);
    if (!transactionType) {
      throw new BadRequestException(
        'type/transactionType phải là INCOME|EXPENSE hoặc income|expense',
      );
    }

    if (!d.category?.trim()) {
      throw new BadRequestException('category là bắt buộc');
    }

    const categoryCanon = normalizeCategoryToCanonical(d.category);
    const allowed = new Set(['TRIP_PAYMENT', 'FUEL', 'REPAIR', 'SALARY']);
    if (!allowed.has(categoryCanon)) {
      throw new BadRequestException(
        'category phải là TRIP_PAYMENT, FUEL, REPAIR hoặc SALARY',
      );
    }

    try {
      validateTypeCategoryPair(transactionType, categoryCanon);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }

    const description = d.description ?? d.note;

    return {
      transactionDate,
      transactionType,
      category: categoryCanon,
      amount: d.amount,
      description,
      transactionCode: d.transactionCode,
      tripId: d.tripId,
      vehicleId: d.vehicleId,
      employeeId: d.employeeId,
      customerId: d.customerId,
      paymentMethod: d.paymentMethod,
      status: d.status ?? 'completed',
    };
  }

  async create(companyId: string, createTransactionDto: CreateTransactionDto) {
    const payload = this.parseCreatePayload(createTransactionDto);
    if (Number(payload.amount) <= 0) {
      throw new BadRequestException('amount phải > 0');
    }

    const transaction = this.transactionRepository.create({
      ...payload,
      companyId,
    });
    const saved = await this.transactionRepository.save(transaction);
    return this.toFinanceRow(saved);
  }

  /** Chuẩn hóa response cho FE (type INCOME, date, note) */
  toFinanceRow(t: Transaction) {
    return {
      id: t.id,
      companyId: t.companyId,
      type: typeDbToApi(t.transactionType),
      category: normalizeCategoryToCanonical(t.category),
      amount: Number(t.amount),
      tripId: t.tripId,
      vehicleId: t.vehicleId,
      employeeId: t.employeeId,
      customerId: t.customerId,
      date: t.transactionDate,
      note: t.description ?? null,
      transactionCode: t.transactionCode,
      paymentMethod: t.paymentMethod,
      status: t.status,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }

  private dateRangeFromQuery(query: QueryTransactionDto) {
    const fromDate = query.fromDate ?? query.startDate;
    const toDate = query.toDate ?? query.endDate;
    return { fromDate, toDate, startDate: fromDate, endDate: toDate };
  }

  async findAll(companyId: string, query: QueryTransactionDto) {
    const {
      page = 1,
      limit = 20,
      type,
      category,
      tripId,
      vehicleId,
      employeeId,
      customerId,
      status,
    } = query;
    const { fromDate, toDate } = this.dateRangeFromQuery(query);
    const skip = (page - 1) * limit;

    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.companyId = :companyId', { companyId });

    if (fromDate && toDate) {
      queryBuilder.andWhere(
        'transaction.transactionDate BETWEEN :fromDate AND :toDate',
        { fromDate, toDate },
      );
    } else if (fromDate) {
      queryBuilder.andWhere('transaction.transactionDate >= :fromDate', {
        fromDate,
      });
    } else if (toDate) {
      queryBuilder.andWhere('transaction.transactionDate <= :toDate', {
        toDate,
      });
    }

    if (type) {
      const tdb = normalizeTypeToDb(type);
      if (tdb) {
        queryBuilder.andWhere('transaction.transactionType = :tt', {
          tt: tdb,
        });
      }
    }

    if (category) {
      const canon = normalizeCategoryToCanonical(category);
      queryBuilder.andWhere(
        '(UPPER(TRIM(transaction.category)) = :cat OR LOWER(TRIM(transaction.category)) = :legacy)',
        {
          cat: canon,
          legacy: category.toLowerCase(),
        },
      );
    }

    if (tripId) {
      queryBuilder.andWhere('transaction.tripId = :tripId', { tripId });
    }

    if (vehicleId) {
      queryBuilder.andWhere('transaction.vehicleId = :vehicleId', {
        vehicleId,
      });
    }

    if (employeeId) {
      queryBuilder.andWhere('transaction.employeeId = :employeeId', {
        employeeId,
      });
    }

    if (customerId) {
      queryBuilder.andWhere('transaction.customerId = :customerId', {
        customerId,
      });
    }

    if (status) {
      queryBuilder.andWhere('transaction.status = :status', { status });
    }

    queryBuilder.orderBy('transaction.transactionDate', 'DESC');

    const [rows, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: rows.map((t) => this.toFinanceRow(t)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(companyId: string, id: string) {
    const transaction = await this.transactionRepository.findOne({
      where: { id, companyId },
      relations: ['trip', 'vehicle', 'employee', 'customer'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return {
      ...this.toFinanceRow(transaction),
      trip: transaction.trip,
      vehicle: transaction.vehicle,
      employee: transaction.employee,
      customer: transaction.customer,
    };
  }

  async update(
    companyId: string,
    id: string,
    updateTransactionDto: UpdateTransactionDto,
  ) {
    const t = await this.transactionRepository.findOne({
      where: { id, companyId },
    });
    if (!t) throw new NotFoundException('Transaction not found');

    const d = updateTransactionDto as any;
    const tdStr = this.normalizeDateInput(
      d.date ?? d.transactionDate ?? t.transactionDate,
    );
    if (!tdStr) {
      throw new BadRequestException('Không xác định được ngày giao dịch');
    }

    const merged: CreateTransactionDto = {
      transactionDate: tdStr,
      transactionType: d.transactionType ?? d.type ?? t.transactionType,
      category: d.category ?? t.category,
      amount: d.amount != null ? d.amount : Number(t.amount),
      description: d.description ?? d.note ?? t.description,
      transactionCode: d.transactionCode ?? t.transactionCode,
      tripId: d.tripId ?? t.tripId,
      vehicleId: d.vehicleId ?? t.vehicleId,
      employeeId: d.employeeId ?? t.employeeId,
      customerId: d.customerId ?? t.customerId,
      paymentMethod: d.paymentMethod ?? t.paymentMethod,
      status: d.status ?? t.status,
    };

    const payload = this.parseCreatePayload(merged);
    Object.assign(t, {
      ...payload,
      amount: merged.amount,
    });
    const saved = await this.transactionRepository.save(t);
    return this.toFinanceRow(saved);
  }

  async remove(companyId: string, id: string) {
    const t = await this.transactionRepository.findOne({
      where: { id, companyId },
    });
    if (!t) throw new NotFoundException('Transaction not found');
    t.status = 'cancelled';
    return await this.transactionRepository.save(t);
  }

  private baseCompletedQuery(
    companyId: string,
    fromDate?: string,
    toDate?: string,
  ) {
    const qb = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.companyId = :companyId', { companyId })
      .andWhere('transaction.status = :status', { status: 'completed' });

    if (fromDate && toDate) {
      qb.andWhere(
        'transaction.transactionDate BETWEEN :fromDate AND :toDate',
        { fromDate, toDate },
      );
    } else if (fromDate) {
      qb.andWhere('transaction.transactionDate >= :fromDate', { fromDate });
    } else if (toDate) {
      qb.andWhere('transaction.transactionDate <= :toDate', { toDate });
    }
    return qb;
  }

  async getSummary(
    companyId: string,
    fromDate?: string,
    toDate?: string,
  ) {
    const rows = await this.baseCompletedQuery(companyId, fromDate, toDate)
      .getMany();

    let totalIncome = 0;
    let totalExpense = 0;
    for (const t of rows) {
      const a = Number(t.amount);
      if (t.transactionType === 'income') totalIncome += a;
      else totalExpense += a;
    }

    return {
      totalIncome,
      totalExpense,
      profit: totalIncome - totalExpense,
    };
  }

  async getBreakdown(
    companyId: string,
    fromDate?: string,
    toDate?: string,
  ) {
    const rows = await this.baseCompletedQuery(companyId, fromDate, toDate)
      .getMany();

    const income: Record<string, number> = {
      TRIP_PAYMENT: 0,
    };
    const expense: Record<string, number> = {
      FUEL: 0,
      REPAIR: 0,
      SALARY: 0,
    };

    for (const t of rows) {
      const key = normalizeCategoryToCanonical(t.category);
      const a = Number(t.amount);
      if (t.transactionType === 'income') {
        if (!income[key]) income[key] = 0;
        income[key] += a;
      } else {
        if (!expense[key]) expense[key] = 0;
        expense[key] += a;
      }
    }

    return { income, expense };
  }

  async getVehicleSummary(
    companyId: string,
    vehicleId: string,
    fromDate?: string,
    toDate?: string,
  ) {
    const rows = await this.baseCompletedQuery(companyId, fromDate, toDate)
      .andWhere('transaction.vehicleId = :vehicleId', { vehicleId })
      .getMany();

    let totalIncome = 0;
    let totalExpense = 0;
    for (const t of rows) {
      const a = Number(t.amount);
      if (t.transactionType === 'income') totalIncome += a;
      else totalExpense += a;
    }

    return {
      vehicleId,
      totalIncome,
      totalExpense,
      profit: totalIncome - totalExpense,
    };
  }

  async getEmployeeSummary(
    companyId: string,
    employeeId: string,
    fromDate?: string,
    toDate?: string,
  ) {
    const rows = await this.baseCompletedQuery(companyId, fromDate, toDate)
      .andWhere('transaction.employeeId = :employeeId', { employeeId })
      .getMany();

    let totalIncome = 0;
    let totalExpense = 0;
    for (const t of rows) {
      const a = Number(t.amount);
      if (t.transactionType === 'income') totalIncome += a;
      else totalExpense += a;
    }

    return {
      employeeId,
      totalIncome,
      totalExpense,
      profit: totalIncome - totalExpense,
    };
  }

  async exportExcel(
    companyId: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const rows = await this.baseCompletedQuery(companyId, fromDate, toDate)
      .orderBy('transaction.transactionDate', 'DESC')
      .getMany();

    const header = [
      'Ngày',
      'Loại',
      'Danh mục',
      'Số tiền',
      'Xe (vehicleId)',
      'Nhân viên (employeeId)',
      'Ghi chú',
    ];
    const data: (string | number)[][] = [header];

    for (const t of rows) {
      data.push([
        String(t.transactionDate).split('T')[0],
        typeDbToApi(t.transactionType),
        normalizeCategoryToCanonical(t.category),
        Number(t.amount),
        t.vehicleId ?? '',
        t.employeeId ?? '',
        t.description ?? '',
      ]);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Giao dịch');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    const fileName = `transactions_${fromDate ?? 'all'}_${toDate ?? 'all'}.xlsx`;
    return { buffer, fileName };
  }

  async getStats(companyId: string, startDate?: string, endDate?: string) {
    const s = await this.getSummary(companyId, startDate, endDate);
    const breakdown = await this.getBreakdown(companyId, startDate, endDate);
    return {
      totalIncome: s.totalIncome,
      totalExpense: s.totalExpense,
      netAmount: s.profit,
      profit: s.profit,
      byCategory: { ...breakdown.income, ...breakdown.expense },
    };
  }

  async getBalance(companyId: string) {
    const rows = await this.transactionRepository.find({
      where: { companyId, status: 'completed' },
    });
    let income = 0;
    let expense = 0;
    for (const t of rows) {
      const a = Number(t.amount);
      if (t.transactionType === 'income') income += a;
      else expense += a;
    }
    return {
      balance: income - expense,
      lastUpdated: new Date(),
    };
  }
}
