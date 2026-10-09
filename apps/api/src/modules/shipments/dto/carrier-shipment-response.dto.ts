import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShipmentStatus } from '../../../../generated/prisma/client';
import { TrackingEventDto } from './tracking-event.dto';

// Separate from ShipmentResponseDto: seller contact and owner must not leak to the seller view.
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

export class CarrierShipmentDetailResponseDto extends CarrierShipmentResponseDto {
  @ApiProperty({ type: [TrackingEventDto] })
  trackingEvents: TrackingEventDto[];
}
