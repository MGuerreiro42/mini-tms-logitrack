import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { toLowerTrimmed } from '../../../shared/transforms/normalize';
import { IsTaxId } from '../../../shared/validation/br-validators';

export class CreateCarrierDto {
  @ApiProperty({ example: 'manager@carrier.example.com' })
  @Transform(toLowerTrimmed)
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password12345', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Fast Freight LLC' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({
    example: '11.222.333/0001-81',
    description:
      'CNPJ (14 digits), punctuation optional; stored as digits only',
  })
  @IsTaxId({ cnpj: true })
  document: string;
}
