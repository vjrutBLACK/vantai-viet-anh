import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Company } from './company.entity';
import { User } from './user.entity';

@Entity('import_logs')
export class ImportLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'company_id' })
  @Index()
  companyId: string;

  @Column({ type: 'varchar', length: 255, name: 'file_name' })
  fileName: string;

  @Column({ type: 'bigint', nullable: true, name: 'file_size' })
  fileSize: number;

  @Column({ type: 'int', nullable: true, name: 'total_rows' })
  totalRows: number;

  @Column({ type: 'int', nullable: true, name: 'success_rows' })
  successRows: number;

  @Column({ type: 'int', nullable: true, name: 'error_rows' })
  errorRows: number;

  @Column({ type: 'varchar', length: 20 })
  @Index()
  status: string; // processing, completed, failed

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'imported_by' })
  importedBy: User;

  @Column({ name: 'imported_by', nullable: true })
  importedById: string;

  @CreateDateColumn({ name: 'started_at' })
  @Index()
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt: Date;
}
