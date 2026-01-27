import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trip } from '../../entities/trip.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { Employee } from '../../entities/employee.entity';
import { Customer } from '../../entities/customer.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Trip)
    private tripRepository: Repository<Trip>,
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) {}

  async getDashboard(companyId: string, startDate?: string, endDate?: string) {
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
    const totalProfit = trips.reduce((sum, t) => sum + Number(t.profit), 0);

    const activeVehicles = await this.vehicleRepository.count({
      where: { companyId, status: 'active' },
    });

    const activeDrivers = await this.employeeRepository.count({
      where: { companyId, position: 'lái xe', status: 'active' },
    });

    // Top vehicles
    const topVehicles = await this.getTopVehicles(companyId, startDate, endDate);
    const topDrivers = await this.getTopDrivers(companyId, startDate, endDate);
    const topCustomers = await this.getTopCustomers(companyId, startDate, endDate);

    // Recent trips
    const recentTrips = await this.tripRepository.find({
      where: { companyId },
      relations: ['vehicle', 'driver', 'customer'],
      order: { tripDate: 'DESC' },
      take: 10,
    });

    return {
      summary: {
        totalTrips,
        completedTrips: totalTrips,
        totalRevenue,
        totalProfit,
        activeVehicles,
        activeDrivers,
      },
      recentTrips,
      topVehicles,
      topDrivers,
      topCustomers,
    };
  }

  async getVehiclesReport(companyId: string, startDate?: string, endDate?: string) {
    return await this.getTopVehicles(companyId, startDate, endDate);
  }

  async getDriversReport(companyId: string, startDate?: string, endDate?: string) {
    return await this.getTopDrivers(companyId, startDate, endDate);
  }

  async getCustomersReport(companyId: string, startDate?: string, endDate?: string) {
    return await this.getTopCustomers(companyId, startDate, endDate);
  }

  async getProfitLossReport(
    companyId: string,
    startDate: string,
    endDate: string,
    groupBy: string = 'month',
  ) {
    const queryBuilder = this.tripRepository
      .createQueryBuilder('trip')
      .where('trip.companyId = :companyId', { companyId })
      .andWhere('trip.status = :status', { status: 'completed' })
      .andWhere('trip.tripDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });

    const trips = await queryBuilder.getMany();

    // Group by period
    const grouped = {};
    trips.forEach((trip) => {
      let key: string;
      if (groupBy === 'day') {
        key = trip.tripDate.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        // Simple week calculation
        const date = new Date(trip.tripDate);
        const week = Math.ceil(date.getDate() / 7);
        key = `${date.getFullYear()}-W${week}`;
      } else {
        // month
        const date = new Date(trip.tripDate);
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!grouped[key]) {
        grouped[key] = {
          period: key,
          totalRevenue: 0,
          totalExpenses: 0,
          netProfit: 0,
        };
      }

      grouped[key].totalRevenue += Number(trip.revenue);
      grouped[key].totalExpenses +=
        Number(trip.fuelCost) +
        Number(trip.tollCost) +
        Number(trip.driverSalary) +
        Number(trip.otherCosts);
      grouped[key].netProfit += Number(trip.profit);
    });

    return Object.values(grouped).map((item: any) => ({
      ...item,
      profitMargin: item.totalRevenue > 0 ? item.netProfit / item.totalRevenue : 0,
    }));
  }

  private async getTopVehicles(
    companyId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const queryBuilder = this.tripRepository
      .createQueryBuilder('trip')
      .select('trip.vehicleId', 'vehicleId')
      .addSelect('vehicle.licensePlate', 'licensePlate')
      .addSelect('COUNT(trip.id)', 'totalTrips')
      .addSelect('SUM(trip.revenue)', 'totalRevenue')
      .addSelect(
        'SUM(trip.fuelCost + trip.tollCost + trip.driverSalary + trip.otherCosts)',
        'totalCosts',
      )
      .addSelect('SUM(trip.profit)', 'totalProfit')
      .leftJoin('trip.vehicle', 'vehicle')
      .where('trip.companyId = :companyId', { companyId })
      .andWhere('trip.status = :status', { status: 'completed' })
      .groupBy('trip.vehicleId')
      .addGroupBy('vehicle.licensePlate')
      .orderBy('totalProfit', 'DESC')
      .limit(10);

    if (startDate && endDate) {
      queryBuilder.andWhere('trip.tripDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const results = await queryBuilder.getRawMany();

    return results.map((r) => ({
      vehicleId: r.vehicleId,
      licensePlate: r.licensePlate,
      totalTrips: parseInt(r.totalTrips),
      totalRevenue: parseFloat(r.totalRevenue) || 0,
      totalCosts: parseFloat(r.totalCosts) || 0,
      totalProfit: parseFloat(r.totalProfit) || 0,
      averageProfitPerTrip:
        parseInt(r.totalTrips) > 0
          ? parseFloat(r.totalProfit) / parseInt(r.totalTrips)
          : 0,
    }));
  }

  private async getTopDrivers(
    companyId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const queryBuilder = this.tripRepository
      .createQueryBuilder('trip')
      .select('trip.driverId', 'driverId')
      .addSelect('employee.fullName', 'driverName')
      .addSelect('COUNT(trip.id)', 'totalTrips')
      .addSelect('SUM(trip.revenue)', 'totalRevenue')
      .addSelect('SUM(trip.driverSalary)', 'totalSalary')
      .addSelect('SUM(trip.profit)', 'totalProfit')
      .leftJoin('trip.driver', 'employee')
      .where('trip.companyId = :companyId', { companyId })
      .andWhere('trip.status = :status', { status: 'completed' })
      .groupBy('trip.driverId')
      .addGroupBy('employee.fullName')
      .orderBy('totalProfit', 'DESC')
      .limit(10);

    if (startDate && endDate) {
      queryBuilder.andWhere('trip.tripDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const results = await queryBuilder.getRawMany();

    return results.map((r) => ({
      driverId: r.driverId,
      driverName: r.driverName,
      totalTrips: parseInt(r.totalTrips),
      totalRevenue: parseFloat(r.totalRevenue) || 0,
      totalSalary: parseFloat(r.totalSalary) || 0,
      totalProfit: parseFloat(r.totalProfit) || 0,
    }));
  }

  private async getTopCustomers(
    companyId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const queryBuilder = this.tripRepository
      .createQueryBuilder('trip')
      .select('trip.customerId', 'customerId')
      .addSelect('customer.name', 'customerName')
      .addSelect('COUNT(trip.id)', 'totalTrips')
      .addSelect('SUM(trip.revenue)', 'totalRevenue')
      .leftJoin('trip.customer', 'customer')
      .where('trip.companyId = :companyId', { companyId })
      .andWhere('trip.status = :status', { status: 'completed' })
      .groupBy('trip.customerId')
      .addGroupBy('customer.name')
      .orderBy('totalRevenue', 'DESC')
      .limit(10);

    if (startDate && endDate) {
      queryBuilder.andWhere('trip.tripDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const results = await queryBuilder.getRawMany();

    return results.map((r) => ({
      customerId: r.customerId,
      customerName: r.customerName,
      totalTrips: parseInt(r.totalTrips),
      totalRevenue: parseFloat(r.totalRevenue) || 0,
    }));
  }
}
