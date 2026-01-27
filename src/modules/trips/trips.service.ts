import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Trip } from '../../entities/trip.entity';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { QueryTripDto } from './dto/query-trip.dto';

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip)
    private tripRepository: Repository<Trip>,
  ) {}

  async create(companyId: string, createTripDto: CreateTripDto) {
    const trip = this.tripRepository.create({
      ...createTripDto,
      companyId,
    });

    // Calculate profit
    trip.profit = trip.calculateProfit();

    return await this.tripRepository.save(trip);
  }

  async findAll(companyId: string, query: QueryTripDto) {
    const {
      page = 1,
      limit = 20,
      startDate,
      endDate,
      vehicleId,
      driverId,
      customerId,
      status,
      search,
    } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.tripRepository
      .createQueryBuilder('trip')
      .leftJoinAndSelect('trip.vehicle', 'vehicle')
      .leftJoinAndSelect('trip.driver', 'driver')
      .leftJoinAndSelect('trip.coDriver', 'coDriver')
      .leftJoinAndSelect('trip.customer', 'customer')
      .where('trip.companyId = :companyId', { companyId });

    if (startDate && endDate) {
      queryBuilder.andWhere('trip.tripDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      queryBuilder.andWhere('trip.tripDate >= :startDate', { startDate });
    } else if (endDate) {
      queryBuilder.andWhere('trip.tripDate <= :endDate', { endDate });
    }

    if (vehicleId) {
      queryBuilder.andWhere('trip.vehicleId = :vehicleId', { vehicleId });
    }

    if (driverId) {
      queryBuilder.andWhere('trip.driverId = :driverId', { driverId });
    }

    if (customerId) {
      queryBuilder.andWhere('trip.customerId = :customerId', { customerId });
    }

    if (status) {
      queryBuilder.andWhere('trip.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere(
        '(trip.tripCode ILIKE :search OR trip.origin ILIKE :search OR trip.destination ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy('trip.tripDate', 'DESC');

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
    const trip = await this.tripRepository.findOne({
      where: { id, companyId },
      relations: ['vehicle', 'driver', 'coDriver', 'customer'],
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    return trip;
  }

  async update(companyId: string, id: string, updateTripDto: UpdateTripDto) {
    const trip = await this.findOne(companyId, id);
    Object.assign(trip, updateTripDto);

    // Recalculate profit
    trip.profit = trip.calculateProfit();

    return await this.tripRepository.save(trip);
  }

  async remove(companyId: string, id: string) {
    const trip = await this.findOne(companyId, id);
    trip.status = 'cancelled';
    return await this.tripRepository.save(trip);
  }

  async getStats(companyId: string, startDate?: string, endDate?: string) {
    const queryBuilder = this.tripRepository
      .createQueryBuilder('trip')
      .where('trip.companyId = :companyId', { companyId })
      .andWhere('trip.status = :status', { status: 'completed' });

    if (startDate && endDate) {
      queryBuilder.andWhere('trip.tripDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const trips = await queryBuilder.getMany();

    const totalTrips = trips.length;
    const totalRevenue = trips.reduce((sum, t) => sum + Number(t.revenue), 0);
    const totalCosts = trips.reduce(
      (sum, t) =>
        sum +
        Number(t.fuelCost) +
        Number(t.tollCost) +
        Number(t.driverSalary) +
        Number(t.otherCosts),
      0,
    );
    const totalProfit = trips.reduce((sum, t) => sum + Number(t.profit), 0);

    return {
      totalTrips,
      completedTrips: totalTrips,
      totalRevenue,
      totalCosts,
      totalProfit,
      averageProfitPerTrip: totalTrips > 0 ? totalProfit / totalTrips : 0,
    };
  }
}
