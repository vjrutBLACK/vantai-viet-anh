import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { Vehicle } from './vehicle.entity';
import { Employee } from './employee.entity';
import { Customer } from './customer.entity';
import { Trip } from './trip.entity';
import { Transaction } from './transaction.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'tax_code' })
  taxCode: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => User, (user) => user.company)
  users: User[];

  @OneToMany(() => Vehicle, (vehicle) => vehicle.company)
  vehicles: Vehicle[];

  @OneToMany(() => Employee, (employee) => employee.company)
  employees: Employee[];

  @OneToMany(() => Customer, (customer) => customer.company)
  customers: Customer[];

  @OneToMany(() => Trip, (trip) => trip.company)
  trips: Trip[];

  @OneToMany(() => Transaction, (transaction) => transaction.company)
  transactions: Transaction[];
}
