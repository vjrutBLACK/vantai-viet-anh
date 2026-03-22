import { IsEmail, IsOptional, IsString, MinLength, IsArray, ArrayNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  fullName: string;

  @IsString()
  @IsOptional()
  employeeId?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roles: string[]; // role names, e.g. ['ACCOUNTANT']
}

