import { ApiProperty } from '@nestjs/swagger';

export class SellerStatusCountsResponseDto {
  @ApiProperty()
  PENDING: number;

  @ApiProperty()
  APPROVED: number;

  @ApiProperty()
  REJECTED: number;
}
