import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SellerListStatsDto } from '../../shipments/metrics/list-stats.dto';

export class SellerResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  companyName: string;

  @ApiProperty()
  document: string;

  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional({
    type: SellerListStatsDto,
    description: 'Only with include=stats: the last 30 days',
  })
  stats?: SellerListStatsDto;
}
