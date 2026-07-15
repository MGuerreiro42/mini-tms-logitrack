import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShipmentStatus } from '../../../../generated/prisma/client';

export class TrackingEventDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ShipmentStatus })
  status: ShipmentStatus;

  @ApiPropertyOptional({ nullable: true })
  note: string | null;

  @ApiProperty()
  createdAt: Date;
}
