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

@Entity('vehicles')
@Index(['companyId', 'licensePlate'], { unique: true })
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'company_id' })
  @Index()
  companyId: string;

  @Column({ type: 'varchar', length: 20, name: 'license_plate' })
  @Index()
  licensePlate: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'vehicle_type' })
  vehicleType: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  brand: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model: string;

  @Column({ type: 'int', nullable: true })
  year: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  capacity: number;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  @Index()
  status: string; // active, inactive, maintenance

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => Trip, (trip) => trip.vehicle)
  trips: Trip[];

  @OneToMany(() => Transaction, (transaction) => transaction.vehicle)
  transactions: Transaction[];
}
