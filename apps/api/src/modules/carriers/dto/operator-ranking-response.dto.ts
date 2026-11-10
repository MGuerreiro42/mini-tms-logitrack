import { ApiProperty } from '@nestjs/swagger';
import { CarrierRole } from '../../../../generated/prisma/client';
import { RateDto } from '../../shipments/metrics/metrics-response.dto';

export class OperatorRankingItemResponseDto {
  @ApiProperty()
  carrierUserId: string;

  @ApiProperty({ type: String, nullable: true })
  name: string | null;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: CarrierRole })
  role: CarrierRole;

  @ApiProperty({ description: 'Owned and open now' })
  active: number;

  @ApiProperty({ description: 'Owned, created in the window, not cancelled' })
  claimed: number;

  @ApiProperty({ description: 'Owned, created in the window, DELIVERED' })
  delivered: number;

  @ApiProperty({ type: RateDto })
  onTime: RateDto;
}
