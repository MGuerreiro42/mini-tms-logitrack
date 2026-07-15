import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShipmentStatus } from '../../../../generated/prisma/client';
import { TrackingEventDto } from './tracking-event.dto';

// The carrier-facing counterpart to ShipmentResponseDto — deliberately a
// separate class, not a shared base extended both ways: this one carries the
// seller's contact info (needed to fulfil the delivery) and the internal
// CarrierUser owner, neither of which the seller's own view has any reason
// to see about itself or should leak back to it.
export class CarrierShipmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  trackingCode: string;

  @ApiProperty({ enum: ShipmentStatus })
  status: ShipmentStatus;

  @ApiProperty()
  modalityId: string;

  @ApiProperty()
  modalityName: string;

  @ApiProperty()
  sellerId: string;

  @ApiProperty({ description: "The seller's company name" })
  sellerCompanyName: string;

  @ApiProperty({ description: "The seller's contact email" })
  sellerEmail: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'CarrierUser id of whoever claimed this shipment, if any',
  })
  ownerId: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: "The owning CarrierUser's email, if claimed",
  })
  ownerEmail: string | null;

  @ApiProperty()
  addressStreet: string;

  @ApiProperty()
  addressNumber: string;

  @ApiPropertyOptional({ nullable: true })
  addressComplement: string | null;

  @ApiProperty()
  addressNeighborhood: string;

  @ApiProperty()
  addressCity: string;

  @ApiProperty()
  addressState: string;

  @ApiProperty()
  addressZipCode: string;

  @ApiProperty()
  createdAt: Date;
}

// Only the single-record read (GET /shipments/queue/:id) includes the full
// timeline — the paginated queue list deliberately doesn't, same
// over-fetch-avoidance reasoning as ShipmentResponseDto's optional field.
export class CarrierShipmentDetailResponseDto extends CarrierShipmentResponseDto {
  @ApiProperty({ type: [TrackingEventDto] })
  trackingEvents: TrackingEventDto[];
}
