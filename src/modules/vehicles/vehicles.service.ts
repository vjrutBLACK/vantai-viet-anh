import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../../entities/vehicle.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { QueryVehicleDto } from './dto/query-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
  ) {}

  async create(companyId: string, createVehicleDto: CreateVehicleDto) {
    const vehicle = this.vehicleRepository.create({
      ...createVehicleDto,
      companyId,
    });
    return await this.vehicleRepository.save(vehicle);
  }

  async findAll(companyId: string, query: QueryVehicleDto) {
    const { page = 1, limit = 20, search, status, vehicleType } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.vehicleRepository
      .createQueryBuilder('vehicle')
      .where('vehicle.companyId = :companyId', { companyId });

    if (search) {
      queryBuilder.andWhere(
        '(vehicle.licensePlate ILIKE :search OR vehicle.brand ILIKE :search OR vehicle.model ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      queryBuilder.andWhere('vehicle.status = :status', { status });
    }

    if (vehicleType) {
      queryBuilder.andWhere('vehicle.vehicleType = :vehicleType', {
        vehicleType,
      });
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
    const vehicle = await this.vehicleRepository.findOne({
      where: { id, companyId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle;
  }

  async update(companyId: string, id: string, updateVehicleDto: UpdateVehicleDto) {
    const vehicle = await this.findOne(companyId, id);
    Object.assign(vehicle, updateVehicleDto);
    return await this.vehicleRepository.save(vehicle);
  }

  async remove(companyId: string, id: string) {
    const vehicle = await this.findOne(companyId, id);
    vehicle.status = 'inactive';
    return await this.vehicleRepository.save(vehicle);
  }

  async getStats(companyId: string) {
    const [total, active, inactive, maintenance] = await Promise.all([
      this.vehicleRepository.count({ where: { companyId } }),
      this.vehicleRepository.count({
        where: { companyId, status: 'active' },
      }),
      this.vehicleRepository.count({
        where: { companyId, status: 'inactive' },
      }),
      this.vehicleRepository.count({
        where: { companyId, status: 'maintenance' },
      }),
    ]);

    return { total, active, inactive, maintenance };
  }
}
