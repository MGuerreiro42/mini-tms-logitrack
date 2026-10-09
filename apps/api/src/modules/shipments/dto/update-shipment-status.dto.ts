import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ShipmentStatus } from '../../../../generated/prisma/client';
import { TrackingNoteDto } from './tracking-note.dto';

export class UpdateShipmentStatusDto extends TrackingNoteDto {
  @ApiProperty({ enum: ShipmentStatus })
  @IsEnum(ShipmentStatus)
  status: ShipmentStatus;
}
