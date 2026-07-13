import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class SetModalitiesDto {
  @ApiProperty({
    type: [String],
    description:
      'Full desired set of enabled DeliveryModality ids — replaces the current set',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  modalityIds: string[];
}
