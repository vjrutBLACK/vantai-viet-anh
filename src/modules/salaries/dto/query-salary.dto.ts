import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class QuerySalaryDto {
  @IsDateString()
  fromDate: string;

  @IsDateString()
  toDate: string;

  @IsUUID()
  @IsOptional()
  employeeId?: string;

  /** lái xe | phụ xe (điều hành) — tùy mapping vị trí */
  @IsOptional()
  @IsEnum(['driver', 'operator', 'all'] as const)
  role?: 'driver' | 'operator' | 'all';
}
