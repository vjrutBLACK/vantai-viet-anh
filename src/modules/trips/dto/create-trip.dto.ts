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
  @IsOptional()
  vehicleId?: string;

  @IsUUID()
  @IsOptional()
  driverId?: string;

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
  address?: string;

  @IsNumber()
  @IsOptional()
  revenue?: number;

  /** FE alias for `revenue` */
  @IsNumber()
  @IsOptional()
  price?: number;

  /** FE free-text route (stored in `notes` when `notes` omitted) */
  @IsString()
  @IsOptional()
  route?: string;

  @IsNumber()
  @IsOptional()
  paidAmount?: number;

  @IsNumber()
  @IsOptional()
  repairCost?: number;

  @IsNumber()
  @IsOptional()
  fineCost?: number;

  @IsUUID()
  @IsOptional()
  contactEmployeeId?: string | null;

  @IsNumber()
  @IsOptional()
  commissionRateApplied?: number | null;

  @IsNumber()
  @IsOptional()
  fuelCost?: number;

  @IsNumber()
  @IsOptional()
  tollCost?: number;

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
