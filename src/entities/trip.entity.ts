import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Company } from './company.entity';
import { Vehicle } from './vehicle.entity';
import { Employee } from './employee.entity';
import { Customer } from './customer.entity';
import { User } from './user.entity';
import { Transaction } from './transaction.entity';

@Entity('trips')
@Index(['companyId', 'tripCode'], { unique: true })
export class Trip {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'company_id' })
  @Index()
  companyId: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'trip_code' })
  @Index()
  tripCode: string;

  @Column({ type: 'date', name: 'trip_date' })
  @Index()
  tripDate: Date;

  // Foreign Keys
  @ManyToOne(() => Vehicle, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @Column({ name: 'vehicle_id' })
  @Index()
  vehicleId: string;

  @ManyToOne(() => Employee, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'driver_id' })
  driver: Employee;

  @Column({ name: 'driver_id' })
  @Index()
  driverId: string;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'co_driver_id' })
  coDriver: Employee;

  @Column({ name: 'co_driver_id', nullable: true })
  coDriverId: string;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'customer_id' })
  @Index()
  customerId: string;

  // Cargo Information
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'cargo_type' })
  cargoType: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'cargo_weight' })
  cargoWeight: number;

  @Column({ type: 'int', nullable: true, name: 'cargo_quantity' })
  cargoQuantity: number;

  // Location
  @Column({ type: 'varchar', length: 255, nullable: true })
  origin: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  destination: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  distance: number;

  // Financial
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  revenue: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'fuel_cost' })
  fuelCost: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'toll_cost' })
  tollCost: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'driver_salary' })
  driverSalary: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'other_costs' })
  otherCosts: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  profit: number; // Calculated: revenue - (fuel + toll + salary + other)

  // Status & Notes
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  @Index()
  status: string; // pending, in_progress, completed, cancelled

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Metadata
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by', nullable: true })
  createdById: string;

  // Relations
  @OneToMany(() => Transaction, (transaction) => transaction.trip)
  transactions: Transaction[];

  // Calculate profit before save
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true, select: false })
  private _calculatedProfit: number;

  // Method to calculate profit
  calculateProfit(): number {
    return (
      this.revenue -
      (this.fuelCost + this.tollCost + this.driverSalary + this.otherCosts)
    );
  }
}
