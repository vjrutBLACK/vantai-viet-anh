import { IsUUID } from 'class-validator';

export class AssignVehicleDto {
  @IsUUID()
  vehicleId: string;

  @IsUUID()
  driverId: string;
}

