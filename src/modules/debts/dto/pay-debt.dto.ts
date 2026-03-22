import { IsNumber, Min } from 'class-validator';

export class PayDebtDto {
  @IsNumber()
  @Min(0.01)
  amount: number;
}
