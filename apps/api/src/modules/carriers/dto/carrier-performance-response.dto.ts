import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShipmentStatus } from '../../../../generated/prisma/client';
import { ShipmentStatusCountsResponseDto } from '../../shipments/dto/shipment-status-counts-response.dto';

export class StageDurationResponseDto {
  @ApiProperty({ enum: ShipmentStatus })
  fromStatus: ShipmentStatus;

  @ApiProperty({ enum: ShipmentStatus })
  toStatus: ShipmentStatus;

  // null, not 0: no observed transition is "no data", not instant.
  @ApiPropertyOptional({ nullable: true })
  avgHours: number | null;

  @ApiProperty()
  sampleCount: number;
}

export class CarrierPerformanceResponseDto {
  @ApiProperty({ type: ShipmentStatusCountsResponseDto })
  shipmentCountsByStatus: ShipmentStatusCountsResponseDto;

  @ApiProperty()
  totalShipments: number;

  // null, not 0: no second event yet is "no data", not instant turnaround.
  @ApiPropertyOptional({ nullable: true })
  avgHoursBetweenEvents: number | null;

  // Unrounded percentages (0-100); formatting is the frontend's job.
  @ApiProperty({
    description: 'Share of shipments that ever had a FAILED_DELIVERY event',
  })
  failedDeliveryRate: number;

  @ApiProperty()
  returnedRate: number;

  @ApiProperty({ type: [StageDurationResponseDto] })
  stageDurations: StageDurationResponseDto[];
}
