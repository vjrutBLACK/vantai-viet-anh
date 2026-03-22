import { IsString, IsOptional, IsEmail, IsNumber, Min } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @IsOptional()
  employeeCode?: string;

  /** Alias spec: ưu tiên fullName nếu có */
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  /** Ví dụ: `lái xe`, `phụ xe` — không dùng trường `role` riêng */
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

  /**
   * Lương nền (VND, ≥ 0) — bắt buộc khi tạo.
   * Phần thu nhập còn lại (hoa hồng chuyến, v.v.) tính riêng, không nhập ở đây.
   * Dùng làm `trips.driverSalary` khi gán tài xế.
   */
  @IsNumber()
  @Min(0)
  baseSalary: number;
}
