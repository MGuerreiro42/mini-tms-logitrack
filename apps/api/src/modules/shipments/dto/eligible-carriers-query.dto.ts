import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { IsUf } from '../../../shared/validation/br-validators';

export class EligibleCarriersQueryDto {
  @ApiProperty({ example: 'SP', description: 'One of the 27 UFs, any case' })
  @IsUf()
  state: string;

  @ApiProperty({
    example: 'São Paulo',
    description:
      'Required — mirrors Shipment.addressCity, which is never optional on the real record',
  })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty()
  @IsUUID('4')
  modalityId: string;
}
