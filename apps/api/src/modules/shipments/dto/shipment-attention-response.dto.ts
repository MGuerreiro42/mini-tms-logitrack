import { ApiProperty } from '@nestjs/swagger';
import { ShipmentResponseDto } from './shipment-response.dto';

export class ShipmentAttentionCountsDto {
  @ApiProperty({ description: 'Shipments in FAILED_DELIVERY' })
  failed: number;

  @ApiProperty({
    description: 'Open shipments past createdAt + modality.slaHours',
  })
  late: number;
}

export class ShipmentAttentionResponseDto {
  @ApiProperty({
    type: [ShipmentResponseDto],
    description: 'Failed deliveries first, then late shipments, at most 5',
  })
  shipments: ShipmentResponseDto[];

  @ApiProperty({ type: ShipmentAttentionCountsDto })
  counts: ShipmentAttentionCountsDto;
}
