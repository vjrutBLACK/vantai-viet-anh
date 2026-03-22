import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../entities/customer.entity';
import { Trip } from '../../entities/trip.entity';
import { Transaction } from '../../entities/transaction.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Trip)
    private tripRepository: Repository<Trip>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
  ) {}

  async create(companyId: string, createCustomerDto: CreateCustomerDto) {
    const customer = this.customerRepository.create({
      ...createCustomerDto,
      companyId,
    });
    return await this.customerRepository.save(customer);
  }

  async findAll(companyId: string, query: QueryCustomerDto) {
    const { page = 1, limit = 20, search, status } = query;
    const skip = (page - 1) * limit;

    const baseQb = this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.companyId = :companyId', { companyId });

    if (search) {
      baseQb.andWhere(
        '(customer.name ILIKE :search OR customer.customerCode ILIKE :search OR customer.phone ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      baseQb.andWhere('customer.status = :status', { status });
    }

    const total = await baseQb.getCount();

    // Add derived debt fields for list screen:
    // totalAmount = SUM(trip.revenue) where trip.status='completed'
    // paidAmount = SUM(tx.amount) where tx.transactionType='income'
    const rows = await baseQb
      .clone()
      .leftJoin(
        Trip,
        'trip',
        `trip.customer_id = customer.id AND trip.company_id = customer.company_id AND trip.status = 'completed'`,
      )
      .leftJoin(
        Transaction,
        'tx',
        `tx.customer_id = customer.id AND tx.company_id = customer.company_id AND tx.transaction_type = 'income'`,
      )
      .select('customer.id', 'id')
      .addSelect('customer.customer_code', 'customerCode')
      .addSelect('customer.name', 'name')
      .addSelect('customer.phone', 'phone')
      .addSelect('customer.email', 'email')
      .addSelect('customer.address', 'address')
      .addSelect('customer.tax_code', 'taxCode')
      .addSelect('customer.contact_person', 'contactPerson')
      .addSelect('customer.status', 'status')
      .addSelect('customer.created_at', 'createdAt')
      .addSelect('customer.updated_at', 'updatedAt')
      .addSelect('COALESCE(SUM(trip.revenue), 0)', 'totalAmount')
      .addSelect('COALESCE(SUM(tx.amount), 0)', 'paidAmount')
      .groupBy('customer.id')
      .orderBy('customer.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getRawMany<{
        id: string;
        customerCode: string;
        name: string;
        phone: string;
        email: string;
        address: string;
        taxCode: string;
        contactPerson: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        totalAmount: string;
        paidAmount: string;
      }>();

    const data = rows.map((r) => {
      const totalAmount = parseFloat(r.totalAmount || '0');
      const paidAmount = parseFloat(r.paidAmount || '0');
      return {
        id: r.id,
        customerCode: r.customerCode,
        name: r.name,
        phone: r.phone,
        email: r.email,
        address: r.address,
        taxCode: r.taxCode,
        contactPerson: r.contactPerson,
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        totalAmount,
        paidAmount,
        remainingAmount: totalAmount - paidAmount,
      };
    });

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
    const customer = await this.customerRepository.findOne({
      where: { id, companyId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async update(
    companyId: string,
    id: string,
    updateCustomerDto: UpdateCustomerDto,
  ) {
    const customer = await this.findOne(companyId, id);
    Object.assign(customer, updateCustomerDto);
    return await this.customerRepository.save(customer);
  }

  async remove(companyId: string, id: string) {
    const customer = await this.findOne(companyId, id);
    customer.status = 'inactive';
    return await this.customerRepository.save(customer);
  }

  async getDetail(companyId: string, id: string) {
    const customer = await this.findOne(companyId, id);

    const [totals, recentTrips, recentPayments] = await Promise.all([
      this.getDebtSummary(companyId, id),
      this.getTrips(companyId, id, 1, 10),
      this.getPayments(companyId, id, 1, 10),
    ]);

    return {
      customer,
      debt: totals,
      recentTrips: recentTrips.data,
      recentPayments: recentPayments.data,
    };
  }

  async getTrips(companyId: string, customerId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.tripRepository.findAndCount({
      where: { companyId, customerId },
      order: { tripDate: 'DESC' },
      skip,
      take: limit,
    });

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

  async getPayments(companyId: string, customerId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.transactionRepository.findAndCount({
      where: {
        companyId,
        customerId,
        transactionType: 'income',
      },
      order: { transactionDate: 'DESC' },
      skip,
      take: limit,
    });

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

  async getDebtSummary(companyId: string, customerId: string) {
    const { totalRevenue } = await this.tripRepository
      .createQueryBuilder('trip')
      .select('COALESCE(SUM(trip.revenue), 0)', 'totalRevenue')
      .where('trip.companyId = :companyId', { companyId })
      .andWhere('trip.customerId = :customerId', { customerId })
      .andWhere('trip.status = :status', { status: 'completed' })
      .getRawOne<{ totalRevenue: string }>();

    const { totalPaid } = await this.transactionRepository
      .createQueryBuilder('tx')
      .select('COALESCE(SUM(tx.amount), 0)', 'totalPaid')
      .where('tx.companyId = :companyId', { companyId })
      .andWhere('tx.customerId = :customerId', { customerId })
      .andWhere('tx.transactionType = :type', { type: 'income' })
      .getRawOne<{ totalPaid: string }>();

    const totalAmount = parseFloat(totalRevenue || '0');
    const paidAmount = parseFloat(totalPaid || '0');
    const remainingAmount = totalAmount - paidAmount;

    return {
      totalAmount,
      paidAmount,
      remainingAmount,
    };
  }
}
