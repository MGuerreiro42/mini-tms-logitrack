import { ApiProperty } from '@nestjs/swagger';

// One property per ShipmentStatus value — a single groupBy query, replacing
// what the seller dashboard used to do with 3 separate `findAllForSeller`
// calls (one per status, `limit: 1`, discarding `data`) just to read
// `meta.total` for each. Also fixes a real bug those 3 calls had: they only
// covered PENDING/IN_TRANSIT/DELIVERED, so the dashboard's "Total" tile
// (built from a 4th, unfiltered call) never reconciled with the sum of the
// other three whenever a shipment sat in any of the other 6 statuses.
export class ShipmentStatusCountsResponseDto {
  @ApiProperty()
  PENDING: number;

  @ApiProperty()
  ACCEPTED: number;

  @ApiProperty()
  COLLECTED: number;

  @ApiProperty()
  IN_TRANSIT: number;

  @ApiProperty()
  OUT_FOR_DELIVERY: number;

  @ApiProperty()
  DELIVERED: number;

  @ApiProperty()
  FAILED_DELIVERY: number;

  @ApiProperty()
  CANCELLED: number;

  @ApiProperty()
  RETURNED: number;
}
