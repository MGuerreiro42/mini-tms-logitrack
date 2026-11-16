import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CarrierListStatsDto } from '../../shipments/metrics/list-stats.dto';

export class CarrierResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      "The manager's email (User.email via CarrierUser); null without a manager",
  })
  email: string | null;

  @ApiProperty()
  companyName: string;

  @ApiProperty()
  document: string;

  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  status: string;

  @ApiProperty({
    description: 'Number of CarrierUser accounts (manager + operators)',
  })
  userCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional({
    type: CarrierListStatsDto,
    description: 'Only with include=stats: the last 30 days',
  })
  stats?: CarrierListStatsDto;
}
