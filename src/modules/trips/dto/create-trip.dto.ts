import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsUUID,
} from 'class-validator';

export class CreateTripDto {
  @IsString()
  @IsOptional()
  tripCode?: string;

  @IsDateString()
  tripDate: string;

  @IsUUID()
  vehicleId: string;

  @IsUUID()
  driverId: string;

  @IsUUID()
  @IsOptional()
  coDriverId?: string;

  @IsUUID()
  customerId: string;

  @IsString()
  @IsOptional()
  cargoType?: string;

  @IsNumber()
  @IsOptional()
  cargoWeight?: number;

  @IsNumber()
  @IsOptional()
  cargoQuantity?: number;

  @IsString()
  @IsOptional()
  origin?: string;

  @IsString()
  @IsOptional()
  destination?: string;

  @IsNumber()
  @IsOptional()
  distance?: number;

  @IsNumber()
  @IsOptional()
  revenue?: number;

  @IsNumber()
  @IsOptional()
  fuelCost?: number;

  @IsNumber()
  @IsOptional()
  tollCost?: number;

  @IsNumber()
  @IsOptional()
  driverSalary?: number;

  @IsNumber()
  @IsOptional()
  otherCosts?: number;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
