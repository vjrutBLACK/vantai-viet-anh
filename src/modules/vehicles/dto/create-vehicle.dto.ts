import { IsString, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum VehicleStatus {
  ACTIVE = 'active',
  MAINTENANCE = 'maintenance',
  INACTIVE = 'inactive',
}

export class CreateVehicleDto {
  /** Biển số (API cũ) */
  @IsString()
  @IsOptional()
  licensePlate?: string;

  /** Alias spec: plateNumber */
  @IsString()
  @IsOptional()
  plateNumber?: string;

  @IsString()
  @IsOptional()
  vehicleType?: string;

  /** Alias spec: type (vd TRUCK) */
  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsNumber()
  @IsOptional()
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  capacity?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const u = value.toUpperCase();
      if (u === 'ACTIVE') return 'active';
      if (u === 'MAINTENANCE') return 'maintenance';
      if (u === 'INACTIVE') return 'inactive';
    }
    return value;
  })
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  /** Chi phí bảo trì (VNĐ) - optional, chỉ khi status = maintenance */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maintenanceCost?: number;
}
