import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsUUID,
  IsEnum,
} from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  @IsOptional()
  transactionCode?: string;

  @IsDateString()
  transactionDate: string;

  @IsEnum(['income', 'expense'])
  transactionType: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  amount: number;

  @IsString()
  @IsOptional()
  description?: string;

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
