import {
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
} from '@nestjs/swagger';
import { ShipmentStatus } from '../../../../generated/prisma/client';
import { LiveMapDto } from './live-map.dto';
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

  @ApiProperty({
    type: Date,
    nullable: true,
    description:
      'createdAt + modality slaHours, fixed at creation; null when no SLA is tracked',
  })
  dueAt: Date | null;

  @ApiProperty({
    type: Date,
    nullable: true,
    description: 'When the shipment reached DELIVERED; null until then',
  })
  deliveredAt: Date | null;

  @ApiPropertyOptional({ type: [TrackingEventDto] })
  trackingEvents?: TrackingEventDto[];
}

export class ShipmentDetailResponseDto extends IntersectionType(
  ShipmentResponseDto,
  LiveMapDto,
) {}
