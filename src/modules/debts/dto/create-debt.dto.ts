import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';
export class CreateDebtDto {
  @IsEnum(['RECEIVABLE', 'PAYABLE'] as const)
  type: 'RECEIVABLE' | 'PAYABLE';

  @ValidateIf((o) => o.type === 'RECEIVABLE')
  @IsUUID()
  customerId?: string;

  @ValidateIf((o) => o.type === 'PAYABLE')
  @IsUUID()
  supplierId?: string;

  @IsUUID()
  @IsOptional()
  tripId?: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  paidAmount?: number;

  @IsDateString()
  dueDate: string;

  @IsString()
  @IsOptional()
  note?: string;
}
