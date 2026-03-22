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
import { Employee } from './employee.entity';

/** Cấu hình lương biến (theo chuyến / % doanh thu); lương cứng ưu tiên từ đây nếu set, không thì lấy employees.baseSalary */
@Entity('salary_configs')
@Index(['companyId', 'employeeId'], { unique: true })
export class SalaryConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'company_id' })
  @Index()
  companyId: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ name: 'employee_id' })
  employeeId: string;

  /** Nếu null → dùng employee.baseSalary */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
    name: 'base_salary',
  })
  baseSalary: number | null;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    name: 'per_trip',
  })
  perTrip: number;

  /** % doanh thu (vd: 5 = 5%) */
  @Column({
    type: 'decimal',
    precision: 7,
    scale: 4,
    default: 0,
    name: 'revenue_percent',
  })
  revenuePercent: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
