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

@Entity('data_mappings')
@Index(['companyId', 'entityType', 'sourceValue'], { unique: true })
export class DataMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'company_id' })
  @Index()
  companyId: string;

  @Column({ type: 'varchar', length: 50, name: 'entity_type' })
  @Index()
  entityType: string; // vehicle, employee, customer

  @Column({ type: 'varchar', length: 255, name: 'source_value' })
  @Index()
  sourceValue: string; // Value from Excel

  @Column({ type: 'uuid', name: 'target_id' })
  targetId: string; // Mapped entity ID

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 1.0, name: 'confidence_score' })
  confidenceScore: number; // 0.0 - 1.0

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
