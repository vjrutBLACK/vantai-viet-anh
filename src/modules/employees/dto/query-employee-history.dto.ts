import { IsDateString, IsInt, IsOptional, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryEmployeeTripsDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

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
}

export class QueryEmployeeSalaryHistoryDto {
  @IsDateString()
  fromDate: string;

  @IsDateString()
  toDate: string;

  /** dynamic = tính từ trip + salary_configs (mặc định); transactions = giao dịch category salary */
  @IsOptional()
  @IsIn(['dynamic', 'transactions'])
  source?: 'dynamic' | 'transactions';
}

export class QueryEmployeeIncomeDto {
  @IsDateString()
  fromDate: string;

  @IsDateString()
  toDate: string;
}
