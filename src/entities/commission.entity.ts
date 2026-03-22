import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Company } from './company.entity';
import { Employee } from './employee.entity';
import { Customer } from './customer.entity';
import { Trip } from './trip.entity';

@Entity('commissions')
@Unique(['tripId'])
export class Commission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'company_id' })
  @Index()
  companyId: string;

  @ManyToOne(() => Employee, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ name: 'employee_id' })
  @Index()
  employeeId: string;

  @ManyToOne(() => Customer, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'customer_id', nullable: true })
  @Index()
  customerId: string;

  @ManyToOne(() => Trip, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  @Column({ name: 'trip_id' })
  @Index()
  tripId: string;

  @Column({ type: 'date', name: 'trip_date' })
  @Index()
  tripDate: Date;

  // YYYY-MM for fast monthly grouping
  @Column({ type: 'varchar', length: 7 })
  @Index()
  period: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'revenue_base', default: 0 })
  revenueBase: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'commission_rate', default: 0 })
  commissionRate: number; // percent

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  amount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

