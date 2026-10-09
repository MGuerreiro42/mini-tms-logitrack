import { ApiProperty } from '@nestjs/swagger';

export class OperatorRankingItemResponseDto {
  @ApiProperty()
  carrierUserId: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  totalOwned: number;

  @ApiProperty()
  delivered: number;
}
