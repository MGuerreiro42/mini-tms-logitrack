import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShipmentStatus } from '../../../../generated/prisma/client';

export class TrackingEventDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ShipmentStatus })
  status: ShipmentStatus;

  @ApiPropertyOptional({ nullable: true })
  note: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Name of the user who caused the event, when known',
  })
  actorName: string | null;

  @ApiProperty()
  createdAt: Date;
}
