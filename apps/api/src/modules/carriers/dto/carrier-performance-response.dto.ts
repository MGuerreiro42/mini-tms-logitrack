import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShipmentStatus } from '../../../../generated/prisma/client';
import { ShipmentStatusCountsResponseDto } from '../../shipments/dto/shipment-status-counts-response.dto';

export class StageDurationResponseDto {
  @ApiProperty({ enum: ShipmentStatus })
  fromStatus: ShipmentStatus;

  @ApiProperty({ enum: ShipmentStatus })
  toStatus: ShipmentStatus;

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

  @ApiPropertyOptional({ nullable: true })
  avgHoursBetweenEvents: number | null;

  @ApiProperty({
    description: 'Share of shipments that ever had a FAILED_DELIVERY event',
  })
  failedDeliveryRate: number;

  @ApiProperty()
  returnedRate: number;

  @ApiProperty({ type: [StageDurationResponseDto] })
  stageDurations: StageDurationResponseDto[];
}
