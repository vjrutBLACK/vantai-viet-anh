import { IsDateString, IsOptional } from 'class-validator';

export class QueryFinanceReportDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
