import { IsNumber, IsOptional, Min, ValidateIf } from 'class-validator';

export class UpsertSalaryConfigDto {
  /** null = bỏ override, dùng employee.baseSalary */
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsNumber()
  @Min(0)
  baseSalary?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  perTrip?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  revenuePercent?: number;
}
