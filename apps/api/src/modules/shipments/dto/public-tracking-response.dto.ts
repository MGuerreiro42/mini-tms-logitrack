import { ApiProperty } from '@nestjs/swagger';
import { ShipmentStatus } from '../../../../generated/prisma/client';
import { PublicLiveMapDto } from './live-map.dto';

class PublicTrackingEventDto {
  @ApiProperty({ enum: ShipmentStatus })
  status: ShipmentStatus;

  @ApiProperty()
  createdAt: Date;
}

// Public, unauthenticated shape: no street address, ids, contacts or actors; company names only.
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

  @ApiProperty({ description: "The seller's company name" })
  sellerName: string;

  @ApiProperty({ description: "The carrier's company name" })
  carrierName: string;

  @ApiProperty({ type: [PublicTrackingEventDto] })
  events: PublicTrackingEventDto[];
}
