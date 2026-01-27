import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  licensePlate: string;

  @IsString()
  @IsOptional()
  vehicleType?: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsNumber()
  @IsOptional()
  year?: number;

  @IsNumber()
  @IsOptional()
  capacity?: number;

  @IsString()
  @IsOptional()
  status?: string;
}
