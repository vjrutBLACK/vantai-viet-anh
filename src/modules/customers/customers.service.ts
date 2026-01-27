import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
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

    const queryBuilder = this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.companyId = :companyId', { companyId });

    if (search) {
      queryBuilder.andWhere(
        '(customer.name ILIKE :search OR customer.customerCode ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      queryBuilder.andWhere('customer.status = :status', { status });
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
}
