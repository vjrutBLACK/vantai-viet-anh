import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Debt, DebtStatus } from '../../entities/debt.entity';
import { Trip } from '../../entities/trip.entity';
import { Customer } from '../../entities/customer.entity';
import { Supplier } from '../../entities/supplier.entity';
import { CreateDebtDto } from './dto/create-debt.dto';
import { QueryDebtDto } from './dto/query-debt.dto';
import { PayDebtDto } from './dto/pay-debt.dto';

@Injectable()
export class DebtsService {
  constructor(
    @InjectRepository(Debt)
    private debtRepository: Repository<Debt>,
    @InjectRepository(Trip)
    private tripRepository: Repository<Trip>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
  ) {}

  /** remaining = amount - paidAmount; PAID nếu remaining ≤ 0; OVERDUE nếu quá hạn và còn nợ */
  computeStatus(remaining: number, dueDate: Date): DebtStatus {
    const rem = Number(remaining);
    if (rem <= 0) return 'PAID';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    if (due < today && rem > 0) return 'OVERDUE';
    return 'UNPAID';
  }

  applyComputed(debt: Debt) {
    debt.remaining = Math.max(
      0,
      Number(debt.amount) - Number(debt.paidAmount ?? 0),
    );
    debt.status = this.computeStatus(debt.remaining, debt.dueDate);
  }

  refreshStatus(debt: Debt) {
    this.applyComputed(debt);
  }

  private parseDueDate(dueDate: string): Date {
    const [y, m, d] = dueDate
      .split('T')[0]
      .split('-')
      .map((v) => parseInt(v, 10));
    return new Date(y, m - 1, d);
  }

  async create(companyId: string, dto: CreateDebtDto) {
    if (dto.type === 'RECEIVABLE') {
      if (!dto.customerId) {
        throw new BadRequestException('RECEIVABLE cần customerId');
      }
      if (dto.supplierId) {
        throw new BadRequestException('RECEIVABLE không dùng supplierId');
      }
    } else {
      if (!dto.supplierId) {
        throw new BadRequestException('PAYABLE cần supplierId');
      }
      if (dto.customerId) {
        throw new BadRequestException('PAYABLE không dùng customerId');
      }
    }

    const customer = dto.customerId
      ? await this.customerRepository.findOne({
          where: { id: dto.customerId, companyId },
        })
      : null;
    if (dto.customerId && !customer) {
      throw new NotFoundException('Customer not found');
    }

    const supplier = dto.supplierId
      ? await this.supplierRepository.findOne({
          where: { id: dto.supplierId, companyId },
        })
      : null;
    if (dto.supplierId && !supplier) {
      throw new NotFoundException('Supplier not found');
    }

    if (dto.tripId) {
      const trip = await this.tripRepository.findOne({
        where: { id: dto.tripId, companyId },
      });
      if (!trip) throw new NotFoundException('Trip not found');
      if (dto.type === 'RECEIVABLE' && trip.customerId !== dto.customerId) {
        throw new BadRequestException('customerId không khớp với chuyến');
      }
      const dup = await this.debtRepository.findOne({
        where: { companyId, tripId: dto.tripId },
      });
      if (dup) {
        throw new BadRequestException('Chuyến đã có công nợ gắn');
      }
    }

    const paid = Number(dto.paidAmount ?? 0);
    const amount = Number(dto.amount);
    if (paid > amount) {
      throw new BadRequestException('paidAmount không được vượt amount');
    }

    const dueDate = this.parseDueDate(dto.dueDate);
    const debt = this.debtRepository.create({
      companyId,
      type: dto.type,
      customerId: dto.customerId ?? null,
      supplierId: dto.supplierId ?? null,
      tripId: dto.tripId ?? null,
      amount,
      paidAmount: paid,
      remaining: Math.max(0, amount - paid),
      dueDate,
      status: 'UNPAID',
      note: dto.note ?? null,
    });
    this.applyComputed(debt);
    return this.debtRepository.save(debt);
  }

  /** Gọi sau khi tạo trip — một trip một khoản RECEIVABLE */
  async createReceivableFromTrip(companyId: string, trip: Trip) {
    const existing = await this.debtRepository.findOne({
      where: { companyId, tripId: trip.id },
    });
    if (existing) return existing;

    const amount = Number(trip.revenue);
    const paid = Number(trip.paidAmount ?? 0);
    const remaining = Math.max(0, amount - paid);
    const debt = this.debtRepository.create({
      companyId,
      type: 'RECEIVABLE',
      customerId: trip.customerId,
      tripId: trip.id,
      amount,
      paidAmount: paid,
      remaining,
      dueDate: trip.tripDate,
      status: 'UNPAID',
      note: null,
    });
    this.applyComputed(debt);
    return this.debtRepository.save(debt);
  }

  /** Đồng bộ khi sửa doanh thu / đã thu trên trip */
  async syncReceivableFromTrip(companyId: string, trip: Trip) {
    const debt = await this.debtRepository.findOne({
      where: { companyId, tripId: trip.id },
    });
    if (!debt) {
      return this.createReceivableFromTrip(companyId, trip);
    }
    debt.amount = Number(trip.revenue);
    debt.paidAmount = Number(trip.paidAmount ?? 0);
    debt.dueDate = trip.tripDate;
    this.applyComputed(debt);
    return this.debtRepository.save(debt);
  }

  async findAll(companyId: string, query: QueryDebtDto) {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      customerId,
      supplierId,
      startDate,
      endDate,
      sortBy = 'dueDate',
      sortOrder = 'ASC',
    } = query;
    const skip = (page - 1) * limit;

    const qb = this.debtRepository
      .createQueryBuilder('debt')
      .leftJoinAndSelect('debt.customer', 'customer')
      .leftJoinAndSelect('debt.supplier', 'supplier')
      .leftJoinAndSelect('debt.trip', 'trip')
      .where('debt.companyId = :companyId', { companyId });

    if (type) qb.andWhere('debt.type = :type', { type });
    if (status) qb.andWhere('debt.status = :status', { status });
    if (customerId) qb.andWhere('debt.customerId = :customerId', { customerId });
    if (supplierId) qb.andWhere('debt.supplierId = :supplierId', { supplierId });
    if (startDate && endDate) {
      qb.andWhere('debt.dueDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      qb.andWhere('debt.dueDate >= :startDate', { startDate });
    } else if (endDate) {
      qb.andWhere('debt.dueDate <= :endDate', { endDate });
    }

    const sortCol =
      sortBy === 'remaining'
        ? 'debt.remaining'
        : sortBy === 'createdAt'
          ? 'debt.createdAt'
          : 'debt.dueDate';
    qb.orderBy(sortCol, sortOrder);

    const [rows, total] = await qb.skip(skip).take(limit).getManyAndCount();

    for (const d of rows) {
      this.refreshStatus(d);
    }

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(companyId: string, id: string) {
    const debt = await this.debtRepository.findOne({
      where: { id, companyId },
      relations: ['customer', 'supplier', 'trip'],
    });
    if (!debt) throw new NotFoundException('Debt not found');
    this.refreshStatus(debt);
    return debt;
  }

  async pay(companyId: string, id: string, dto: PayDebtDto) {
    const debt = await this.findOne(companyId, id);
    const payAmt = Number(dto.amount);
    if (payAmt <= 0) {
      throw new BadRequestException('Số tiền thanh toán phải > 0');
    }
    debt.paidAmount = Number(debt.paidAmount) + payAmt;
    if (debt.paidAmount > Number(debt.amount)) {
      debt.paidAmount = Number(debt.amount);
    }
    this.applyComputed(debt);
    return this.debtRepository.save(debt);
  }

  async remove(companyId: string, id: string) {
    const debt = await this.debtRepository.findOne({ where: { id, companyId } });
    if (!debt) throw new NotFoundException('Debt not found');
    await this.debtRepository.remove(debt);
  }
}
