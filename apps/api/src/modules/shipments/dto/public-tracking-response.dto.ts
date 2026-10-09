import { ApiProperty } from '@nestjs/swagger';
import { ShipmentStatus } from '../../../../generated/prisma/client';

// No id or note: public tracking exposes only the timeline.
export class PublicTrackingEventDto {
  @ApiProperty({ enum: ShipmentStatus })
  status: ShipmentStatus;

  @ApiProperty()
  createdAt: Date;
}

// Public, unauthenticated shape: no street address, ids or seller/carrier identity.
export class PublicTrackingResponseDto {
  @ApiProperty()
  trackingCode: string;

  @ApiProperty({ enum: ShipmentStatus })
  status: ShipmentStatus;

  @ApiProperty()
  addressCity: string;

  @ApiProperty()
  addressState: string;

  @ApiProperty()
  modalityName: string;

  @ApiProperty({ type: [PublicTrackingEventDto] })
  events: PublicTrackingEventDto[];
}
