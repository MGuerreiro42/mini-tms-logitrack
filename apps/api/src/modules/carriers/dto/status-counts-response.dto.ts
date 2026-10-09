import { ApiProperty } from '@nestjs/swagger';

export class CarrierStatusCountsResponseDto {
  @ApiProperty()
  PENDING: number;

  @ApiProperty()
  APPROVED: number;

  @ApiProperty()
  REJECTED: number;
}
