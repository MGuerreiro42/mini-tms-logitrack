import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { toTrimmed } from '../../../shared/transforms/normalize';
import { IsCep, IsUf } from '../../../shared/validation/br-validators';

export class CreateShipmentDto {
  @ApiProperty({ example: 'Av. Paulista' })
  @IsString()
  @IsNotEmpty()
  addressStreet: string;

  @ApiProperty({ example: '1000' })
  @IsString()
  @IsNotEmpty()
  addressNumber: string;

  @ApiPropertyOptional({ example: 'Apt 42' })
  @IsOptional()
  @IsString()
  addressComplement?: string;

  @ApiProperty({ example: 'Bela Vista' })
  @IsString()
  @IsNotEmpty()
  addressNeighborhood: string;

  @ApiProperty({ example: 'São Paulo' })
  @Transform(toTrimmed)
  @IsString()
  @IsNotEmpty()
  addressCity: string;

  @ApiProperty({ example: 'SP', description: 'One of the 27 UFs, any case' })
  @IsUf()
  addressState: string;

  @ApiProperty({
    example: '01310-100',
    description: '8 digits, with or without the hyphen; stored as digits only',
  })
  @IsCep()
  addressZipCode: string;

  @ApiProperty({
    description:
      "Must be one of the seller's own enabled SellerModality entries",
  })
  @IsUUID('4')
  modalityId: string;

  @ApiProperty({
    description:
      'Must be an APPROVED carrier that covers the address and offers the chosen modality — re-validated server-side, not trusted from the eligible-carriers preview',
  })
  @IsUUID('4')
  carrierId: string;
}
