import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TrackingEventDto } from './tracking-event.dto';

export class ShipmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  trackingCode: string;

  @ApiProperty({
    enum: [
      'PENDING',
      'ACCEPTED',
      'COLLECTED',
      'IN_TRANSIT',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'FAILED_DELIVERY',
      'CANCELLED',
      'RETURNED',
    ],
  })
  status: string;

  @ApiProperty()
  carrierId: string;

  @ApiProperty()
  carrierName: string;

  @ApiProperty()
  modalityId: string;

  @ApiProperty()
  modalityName: string;

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

  // Only on the single-record read; the paginated list skips the timeline.
  @ApiPropertyOptional({ type: [TrackingEventDto] })
  trackingEvents?: TrackingEventDto[];
}
