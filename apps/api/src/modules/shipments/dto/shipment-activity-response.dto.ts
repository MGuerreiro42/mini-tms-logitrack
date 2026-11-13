import { ApiProperty } from '@nestjs/swagger';
import { ShipmentStatus } from '../../../../generated/prisma/client';

export class ShipmentActivityResponseDto {
  @ApiProperty({ description: 'Tracking event id' })
  id: string;

  @ApiProperty()
  shipmentId: string;

  @ApiProperty({ example: 'TMS-DE0000000038' })
  trackingCode: string;

  @ApiProperty({ enum: ShipmentStatus })
  status: ShipmentStatus;

  @ApiProperty({ example: 'Sorocaba' })
  city: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  dueAt: Date | null;

  @ApiProperty()
  createdAt: Date;
}
