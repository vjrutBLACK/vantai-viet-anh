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
import { Trip } from './trip.entity';
import { Transaction } from './transaction.entity';

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'company_id' })
  @Index()
  companyId: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'employee_code' })
  @Index()
  employeeCode: string;

  @Column({ type: 'varchar', length: 255, name: 'full_name' })
  @Index()
  fullName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Index()
  position: string; // lái xe, phụ xe, quản lý, etc.

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'license_number' })
  licenseNumber: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'license_type' })
  licenseType: string; // B2, C, D, E, etc.

  @Column({ type: 'varchar', length: 20, default: 'active' })
  @Index()
  status: string; // active, inactive

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => Trip, (trip) => trip.driver)
  tripsAsDriver: Trip[];

  @OneToMany(() => Trip, (trip) => trip.coDriver)
  tripsAsCoDriver: Trip[];

  @OneToMany(() => Transaction, (transaction) => transaction.employee)
  transactions: Transaction[];
}
