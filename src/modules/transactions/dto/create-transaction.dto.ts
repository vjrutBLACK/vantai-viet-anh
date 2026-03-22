import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  @IsOptional()
  transactionCode?: string;

  /** Alias của `date` (chuẩn FE) */
  @IsDateString()
  @IsOptional()
  transactionDate?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  /** income | expense | INCOME | EXPENSE */
  @IsString()
  @IsOptional()
  transactionType?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  category: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsUUID()
  @IsOptional()
  tripId?: string;

  @IsUUID()
  @IsOptional()
  vehicleId?: string;

  @IsUUID()
  @IsOptional()
  employeeId?: string;

  @IsUUID()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
