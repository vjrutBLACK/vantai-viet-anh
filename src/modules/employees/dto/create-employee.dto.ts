import { IsString, IsOptional, IsEmail } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @IsOptional()
  employeeCode?: string;

  @IsString()
  fullName: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsString()
  @IsOptional()
  licenseNumber?: string;

  @IsString()
  @IsOptional()
  licenseType?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
