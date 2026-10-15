import { ApiProperty } from '@nestjs/swagger';

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
