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
import { Employee } from './employee.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'company_id' })
  @Index()
  companyId: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'customer_code' })
  @Index()
  customerCode: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  name: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'tax_code' })
  taxCode: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'contact_person' })
  contactPerson: string;

  // Internal account owner for customer (commission recipient)
  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contact_employee_id' })
  contactEmployee: Employee;

  @Column({ name: 'contact_employee_id', nullable: true })
  @Index()
  contactEmployeeId: string;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    name: 'commission_rate',
    default: 0,
  })
  commissionRate: number; // percent

  @Column({ type: 'varchar', length: 20, default: 'active' })
  @Index()
  status: string; // active, inactive

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => Trip, (trip) => trip.customer)
  trips: Trip[];

  @OneToMany(() => Transaction, (transaction) => transaction.customer)
  transactions: Transaction[];
}
