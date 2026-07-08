import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateSellerDto {
  @ApiProperty({ example: 'loja@exemplo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'senha12345', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Loja Exemplo LTDA' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ example: '12345678000199', description: 'CNPJ ou CPF' })
  @IsString()
  @IsNotEmpty()
  document: string;
}
