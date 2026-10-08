import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShipmentStatus } from '../../../../generated/prisma/client';
import { ShipmentStatusCountsResponseDto } from '../../shipments/dto/shipment-status-counts-response.dto';

// One entry per happy-path transition in shipment-status.util.ts's
// ALLOWED_TRANSITIONS, ending at DELIVERED — the failure branch
// (OUT_FOR_DELIVERY -> FAILED_DELIVERY -> RETURNED) isn't part of this
// "how long does a normal delivery take at each stage" funnel.
export class StageDurationResponseDto {
  @ApiProperty({ enum: ShipmentStatus })
  fromStatus: ShipmentStatus;

  @ApiProperty({ enum: ShipmentStatus })
  toStatus: ShipmentStatus;

  // null, not 0 — same reasoning as avgHoursBetweenEvents: no observed
  // transition of this kind yet is a "no data" state, not an instant one.
  @ApiPropertyOptional({ nullable: true })
  avgHours: number | null;

  @ApiProperty()
  sampleCount: number;
}

// FLOW.md Frame 24's proposed contract, implemented as documented there —
// deliberately narrower than the Claude Design mock's example numbers
// ("SLA cumprido %"), which would require a product decision this project
// hasn't made yet (what counts as "on time" against DeliveryModality.slaHours,
// and from which status transition the clock starts). avgHoursBetweenEvents
// is the metric actually specified and reachable from data that exists today.
export class CarrierPerformanceResponseDto {
  @ApiProperty({ type: ShipmentStatusCountsResponseDto })
  shipmentCountsByStatus: ShipmentStatusCountsResponseDto;

  @ApiProperty()
  totalShipments: number;

  // null, not 0 — a carrier whose shipments have no second TrackingEvent yet
  // (every shipment still PENDING, or exactly one event each) has no delta to
  // average, and 0 would misleadingly read as "instant turnaround."
  @ApiPropertyOptional({ nullable: true })
  avgHoursBetweenEvents: number | null;

  // Percentages (0-100), not pre-rounded — presentation formatting is the
  // frontend's job, not baked into the API response.
  @ApiProperty({
    description: 'Share of shipments that ever had a FAILED_DELIVERY event',
  })
  failedDeliveryRate: number;

  @ApiProperty()
  returnedRate: number;

  @ApiProperty({ type: [StageDurationResponseDto] })
  stageDurations: StageDurationResponseDto[];
}
