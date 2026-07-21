import { ApiProperty } from '@nestjs/swagger';

// DeliveryModality.slaHours existed in the schema with no reader anywhere
// until now — deferred because "on time" needed a product decision this
// project hadn't made (see CarrierPerformanceResponseDto's comment). Resolved
// here: the clock starts at Shipment.createdAt (order placed), not COLLECTED
// (pickup) — reflects what the seller/customer actually experiences as the
// wait. Only DELIVERED shipments are counted (a resolved outcome); a
// modality with no slaHours configured has nothing to compare against and is
// left out of the response entirely, rather than reporting a misleading 0%.
export class SlaSummaryItemResponseDto {
  @ApiProperty()
  modalityCode: string;

  @ApiProperty()
  modalityName: string;

  @ApiProperty()
  deliveredCount: number;

  @ApiProperty()
  onTimeCount: number;

  @ApiProperty()
  onTimeRate: number;
}
