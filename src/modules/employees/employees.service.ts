import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../../entities/employee.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { QueryEmployeeDto } from './dto/query-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
  ) {}

  async create(companyId: string, createEmployeeDto: CreateEmployeeDto) {
    const employee = this.employeeRepository.create({
      ...createEmployeeDto,
      companyId,
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
        '(employee.fullName ILIKE :search OR employee.employeeCode ILIKE :search)',
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
    Object.assign(employee, updateEmployeeDto);
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
}
