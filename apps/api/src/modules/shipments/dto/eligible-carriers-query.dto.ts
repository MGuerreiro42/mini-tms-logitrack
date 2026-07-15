import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { toUpperTrimmed } from '../../../shared/transforms/normalize';

export class EligibleCarriersQueryDto {
  @ApiProperty({ example: 'SP' })
  @Transform(toUpperTrimmed)
  @IsString()
  @IsNotEmpty()
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
