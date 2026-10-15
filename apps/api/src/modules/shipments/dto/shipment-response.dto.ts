import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShipmentStatus } from '../../../../generated/prisma/client';
import { ShipmentAddressDto } from './shipment-address.dto';
import { TrackingEventDto } from './tracking-event.dto';

export class ShipmentResponseDto extends ShipmentAddressDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  trackingCode: string;

  @ApiProperty({ enum: ShipmentStatus })
  status: ShipmentStatus;

  @ApiProperty()
  carrierId: string;

  @ApiProperty()
  carrierName: string;

  @ApiProperty()
  modalityId: string;

  @ApiProperty()
  modalityName: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional({ type: [TrackingEventDto] })
  trackingEvents?: TrackingEventDto[];
}
