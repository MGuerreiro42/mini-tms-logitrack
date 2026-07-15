import { ApiProperty } from '@nestjs/swagger';
import { ShipmentStatus } from '../../../../generated/prisma/client';

// Deliberately narrower than TrackingEventDto — no `id`/`note`, matching
// SCREENS.md's explicit privacy stance for the public tracking screen.
export class PublicTrackingEventDto {
  @ApiProperty({ enum: ShipmentStatus })
  status: ShipmentStatus;

  @ApiProperty()
  createdAt: Date;
}

// Deliberately narrower than ShipmentResponseDto — no street address, no
// carrier/seller identity, no `id`. Reachable with no auth via the
// shipment's own trackingCode, so only what a stranger holding a shared
// tracking link should be able to see.
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
