import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { toLowerTrimmed } from '../../../shared/transforms/normalize';

export class CreateSellerDto {
  @ApiProperty({ example: 'seller@example.com' })
  @Transform(toLowerTrimmed)
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password12345', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Example Store LLC' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ example: '12345678000199', description: 'Tax ID (CNPJ/CPF)' })
  @IsString()
  @IsNotEmpty()
  document: string;
}
