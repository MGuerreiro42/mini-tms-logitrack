import { ApiProperty } from '@nestjs/swagger';
import { ShipmentStatus } from '../../../../generated/prisma/client';
import { PublicLiveMapDto } from './live-map.dto';

class PublicTrackingEventDto {
  @ApiProperty({ enum: ShipmentStatus })
  status: ShipmentStatus;

  @ApiProperty()
  createdAt: Date;
}

// Public, unauthenticated shape: no street address, ids or seller/carrier identity.
export class PublicTrackingResponseDto extends PublicLiveMapDto {
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
