import { ApiProperty } from '@nestjs/swagger';

// SLA clock starts at Shipment.createdAt (what the customer experiences), not pickup.
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
