import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { toUpperTrimmed } from '../../../shared/transforms/normalize';

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
  @IsString()
  @IsNotEmpty()
  addressCity: string;

  @ApiProperty({ example: 'SP' })
  @Transform(toUpperTrimmed)
  @IsString()
  @IsNotEmpty()
  addressState: string;

  @ApiProperty({ example: '01310-100' })
  @IsString()
  @IsNotEmpty()
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
