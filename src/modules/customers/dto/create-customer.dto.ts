import { IsString, IsOptional, IsEmail, IsUUID, IsNumber, Min, Max } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @IsOptional()
  customerCode?: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  taxCode?: string;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsUUID()
  @IsOptional()
  contactEmployeeId?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  commissionRate?: number;

  @IsString()
  @IsOptional()
  status?: string;
}
