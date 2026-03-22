import { IsDateString, IsOptional } from 'class-validator';

export class QueryVehicleRepairsDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
