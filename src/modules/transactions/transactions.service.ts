import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../../entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
  ) {}

  async create(companyId: string, createTransactionDto: CreateTransactionDto) {
    const transaction = this.transactionRepository.create({
      ...createTransactionDto,
      companyId,
    });
    return await this.transactionRepository.save(transaction);
  }

  async findAll(companyId: string, query: QueryTransactionDto) {
    const {
      page = 1,
      limit = 20,
      startDate,
      endDate,
      type,
      category,
      tripId,
      vehicleId,
      employeeId,
      customerId,
      status,
    } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.companyId = :companyId', { companyId });

    if (startDate && endDate) {
      queryBuilder.andWhere(
        'transaction.transactionDate BETWEEN :startDate AND :endDate',
        { startDate, endDate },
      );
    } else if (startDate) {
      queryBuilder.andWhere('transaction.transactionDate >= :startDate', {
        startDate,
      });
    } else if (endDate) {
      queryBuilder.andWhere('transaction.transactionDate <= :endDate', {
        endDate,
      });
    }

    if (type) {
      queryBuilder.andWhere('transaction.transactionType = :type', { type });
    }

    if (category) {
      queryBuilder.andWhere('transaction.category = :category', { category });
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
    const transaction = await this.transactionRepository.findOne({
      where: { id, companyId },
      relations: ['trip', 'vehicle', 'employee', 'customer'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async update(
    companyId: string,
    id: string,
    updateTransactionDto: UpdateTransactionDto,
  ) {
    const transaction = await this.findOne(companyId, id);
    Object.assign(transaction, updateTransactionDto);
    return await this.transactionRepository.save(transaction);
  }

  async remove(companyId: string, id: string) {
    const transaction = await this.findOne(companyId, id);
    transaction.status = 'cancelled';
    return await this.transactionRepository.save(transaction);
  }

  async getStats(companyId: string, startDate?: string, endDate?: string) {
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.companyId = :companyId', { companyId })
      .andWhere('transaction.status = :status', { status: 'completed' });

    if (startDate && endDate) {
      queryBuilder.andWhere(
        'transaction.transactionDate BETWEEN :startDate AND :endDate',
        { startDate, endDate },
      );
    }

    const transactions = await queryBuilder.getMany();

    const totalIncome = transactions
      .filter((t) => t.transactionType === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpense = transactions
      .filter((t) => t.transactionType === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const byCategory = {};
    transactions.forEach((t) => {
      if (!byCategory[t.category]) {
        byCategory[t.category] = 0;
      }
      if (t.transactionType === 'income') {
        byCategory[t.category] += Number(t.amount);
      } else {
        byCategory[t.category] -= Number(t.amount);
      }
    });

    return {
      totalIncome,
      totalExpense,
      netAmount: totalIncome - totalExpense,
      byCategory,
    };
  }

  async getBalance(companyId: string) {
    const stats = await this.getStats(companyId);
    return {
      balance: stats.netAmount,
      lastUpdated: new Date(),
    };
  }
}
