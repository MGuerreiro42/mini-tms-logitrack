import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShipmentStatusCountsResponseDto } from '../../shipments/dto/shipment-status-counts-response.dto';

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
  @ApiProperty()
  failedDeliveryRate: number;

  @ApiProperty()
  returnedRate: number;
}
