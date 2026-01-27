import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Company } from './company.entity';
import { Trip } from './trip.entity';
import { Vehicle } from './vehicle.entity';
import { Employee } from './employee.entity';
import { Customer } from './customer.entity';
import { User } from './user.entity';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'company_id' })
  @Index()
  companyId: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'transaction_code' })
  transactionCode: string;

  @Column({ type: 'date', name: 'transaction_date' })
  @Index()
  transactionDate: Date;

  @Column({ type: 'varchar', length: 20, name: 'transaction_type' })
  @Index()
  transactionType: string; // income, expense

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Index()
  category: string; // fuel, salary, maintenance, revenue, toll, other

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Optional Foreign Keys
  @ManyToOne(() => Trip, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  @Column({ name: 'trip_id', nullable: true })
  @Index()
  tripId: string;

  @ManyToOne(() => Vehicle, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @Column({ name: 'vehicle_id', nullable: true })
  @Index()
  vehicleId: string;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ name: 'employee_id', nullable: true })
  @Index()
  employeeId: string;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'customer_id', nullable: true })
  @Index()
  customerId: string;

  // Payment Info
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'payment_method' })
  paymentMethod: string; // cash, bank_transfer, etc.

  @Column({ type: 'varchar', length: 20, default: 'completed' })
  @Index()
  status: string; // pending, completed, cancelled

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
}
