import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../../entities/vehicle.entity';
import { Trip } from '../../entities/trip.entity';
import { Transaction } from '../../entities/transaction.entity';
import { TransactionsService } from '../transactions/transactions.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { QueryVehicleDto } from './dto/query-vehicle.dto';
import { QueryVehicleTripsDto } from './dto/query-vehicle-trips.dto';
import { QueryVehicleRepairsDto } from './dto/query-vehicle-repairs.dto';

@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);

  constructor(
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
    @InjectRepository(Trip)
    private tripRepository: Repository<Trip>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private transactionsService: TransactionsService,
  ) {}

  async create(companyId: string, createVehicleDto: CreateVehicleDto) {
    const {
      plateNumber,
      type,
      licensePlate: lp,
      vehicleType: vt,
      status: st,
      ...rest
    } = createVehicleDto;

    const licensePlate = (lp ?? plateNumber)?.trim();
    if (!licensePlate) {
      throw new BadRequestException('Cần licensePlate hoặc plateNumber');
    }

    const vehicleType = vt ?? type;
    let status = st as string | undefined;
    if (status && typeof status === 'string') {
      const u = status.toUpperCase();
      if (u === 'ACTIVE') status = 'active';
      else if (u === 'INACTIVE') status = 'inactive';
      else if (u === 'MAINTENANCE') status = 'maintenance';
    }

    const vehicle = this.vehicleRepository.create({
      ...rest,
      licensePlate,
      vehicleType,
      status: status ?? 'active',
      companyId,
    });
    const saved = await this.vehicleRepository.save(vehicle);
    await this.syncMaintenanceTransaction(companyId, saved);
    return saved;
  }

  async findAll(companyId: string, query: QueryVehicleDto) {
    const { page = 1, limit, pageSize, search, status, vehicleType } = query;
    const take = limit ?? pageSize ?? 20;
    const skip = (page - 1) * take;

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
      .take(take)
      .getManyAndCount();

    return {
      data,
      pagination: {
        page,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
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
    const {
      plateNumber,
      type,
      licensePlate: lp,
      vehicleType: vt,
      status: st,
      ...rest
    } = updateVehicleDto;

    Object.assign(vehicle, rest);

    if (lp !== undefined || plateNumber !== undefined) {
      const next = (lp ?? plateNumber)?.trim();
      if (next) vehicle.licensePlate = next;
    }
    if (vt !== undefined || type !== undefined) {
      vehicle.vehicleType = vt ?? type;
    }
    if (st !== undefined && st !== null) {
      let status = st as string;
      const u = status.toUpperCase();
      if (u === 'ACTIVE') vehicle.status = 'active';
      else if (u === 'INACTIVE') vehicle.status = 'inactive';
      else if (u === 'MAINTENANCE') vehicle.status = 'maintenance';
      else vehicle.status = status;
    }

    if (updateVehicleDto.maintenanceCost !== undefined) {
      vehicle.maintenanceCost = updateVehicleDto.maintenanceCost;
    }

    const saved = await this.vehicleRepository.save(vehicle);
    await this.syncMaintenanceTransaction(companyId, saved);
    return saved;
  }

  /**
   * Đồng bộ giao dịch thu chi: khi xe status=maintenance và maintenanceCost > 0,
   * tạo/cập nhật transaction EXPENSE REPAIR để tracking thu chi.
   */
  private async syncMaintenanceTransaction(
    companyId: string,
    vehicle: Vehicle,
  ): Promise<void> {
    const cost = Number(vehicle.maintenanceCost ?? 0);
    const isMaintenance = vehicle.status === 'maintenance';

    if (!isMaintenance) {
      const oldTxId = vehicle.maintenanceTransactionId;
      vehicle.maintenanceCost = null;
      vehicle.maintenanceTransactionId = null;
      await this.vehicleRepository.save(vehicle);
      if (oldTxId) {
        const tx = await this.transactionRepository.findOne({
          where: { id: oldTxId, companyId },
        });
        if (tx) {
          tx.status = 'cancelled';
          await this.transactionRepository.save(tx);
        }
      }
      return;
    }

    if (cost <= 0) {
      if (vehicle.maintenanceTransactionId) {
        const tx = await this.transactionRepository.findOne({
          where: { id: vehicle.maintenanceTransactionId, companyId },
        });
        if (tx) {
          tx.status = 'cancelled';
          await this.transactionRepository.save(tx);
        }
        vehicle.maintenanceTransactionId = null;
        vehicle.maintenanceCost = null;
        await this.vehicleRepository.save(vehicle);
      }
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const desc = `Chi phí bảo trì xe ${vehicle.licensePlate}`;

    if (vehicle.maintenanceTransactionId) {
      const tx = await this.transactionRepository.findOne({
        where: { id: vehicle.maintenanceTransactionId, companyId },
      });
      if (tx) {
        tx.amount = cost;
        await this.transactionRepository.save(tx);
        return;
      }
    }

    try {
      const created = await this.transactionsService.create(companyId, {
        transactionDate: today,
        transactionType: 'EXPENSE',
        category: 'REPAIR',
        amount: cost,
        vehicleId: vehicle.id,
        description: desc,
        status: 'completed',
      });
      vehicle.maintenanceTransactionId = created.id;
      await this.vehicleRepository.save(vehicle);
    } catch (e) {
      this.logger.warn(
        `Không tạo giao dịch bảo trì cho xe ${vehicle.id}: ${(e as Error).message}`,
      );
    }
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

  async getTripsHistory(
    companyId: string,
    vehicleId: string,
    query: QueryVehicleTripsDto,
  ) {
    await this.findOne(companyId, vehicleId);

    const {
      page = 1,
      limit = 20,
      fromDate,
      toDate,
    } = query;
    const skip = (page - 1) * limit;

    const qb = this.tripRepository
      .createQueryBuilder('trip')
      .leftJoinAndSelect('trip.driver', 'driver')
      .leftJoinAndSelect('trip.customer', 'customer')
      .where('trip.companyId = :companyId', { companyId })
      .andWhere('trip.vehicleId = :vehicleId', { vehicleId })
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

  /** Chi phí sửa chữa: giao dịch expense gắn xe, category REPAIR / maintenance */
  async getRepairHistory(
    companyId: string,
    vehicleId: string,
    query: QueryVehicleRepairsDto,
  ) {
    await this.findOne(companyId, vehicleId);

    const { fromDate, toDate } = query;

    const qb = this.transactionRepository
      .createQueryBuilder('t')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.vehicleId = :vehicleId', { vehicleId })
      .andWhere('t.transactionType = :exp', { exp: 'expense' })
      .andWhere(
        '(UPPER(TRIM(t.category)) = :re OR LOWER(TRIM(t.category)) IN (:...cats))',
        { re: 'REPAIR', cats: ['repair', 'maintenance'] },
      );

    if (fromDate && toDate) {
      qb.andWhere('t.transactionDate BETWEEN :fromDate AND :toDate', {
        fromDate,
        toDate,
      });
    } else if (fromDate) {
      qb.andWhere('t.transactionDate >= :fromDate', { fromDate });
    } else if (toDate) {
      qb.andWhere('t.transactionDate <= :toDate', { toDate });
    }

    qb.orderBy('t.transactionDate', 'DESC');

    const rows = await qb.getMany();

    return rows.map((txn) => ({
      id: txn.id,
      amount: Number(txn.amount),
      date: txn.transactionDate,
      note: txn.description ?? null,
      category: txn.category,
    }));
  }
}
