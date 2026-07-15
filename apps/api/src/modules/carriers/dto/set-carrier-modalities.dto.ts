import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class SetCarrierModalitiesDto {
  @ApiProperty({
    type: [String],
    description:
      'Full desired set of operated DeliveryModality ids — replaces the current set',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  modalityIds: string[];
}
