import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DebtStatus, DebtType } from '../../../entities/debt.entity';

export class QueryDebtDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsIn(['RECEIVABLE', 'PAYABLE'])
  type?: DebtType;

  @IsOptional()
  @IsIn(['UNPAID', 'PAID', 'OVERDUE'])
  status?: DebtStatus;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsIn(['dueDate', 'remaining', 'createdAt'])
  sortBy?: 'dueDate' | 'remaining' | 'createdAt' = 'dueDate';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}
