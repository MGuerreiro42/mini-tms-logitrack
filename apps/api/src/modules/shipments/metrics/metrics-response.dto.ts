import { ApiProperty } from '@nestjs/swagger';

export class RateDto {
  @ApiProperty({ description: 'The denominator (sample size)' })
  n: number;

  @ApiProperty({ description: 'The numerator' })
  count: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'count ÷ n × 100; null when n = 0',
  })
  rate: number | null;
}

export class OnTimeTrendDto extends RateDto {
  @ApiProperty({
    type: [Number],
    nullable: true,
    description:
      'On-time rate per twelfth of the window by createdAt; null for an empty bucket',
  })
  trend: (number | null)[];
}

export class ModalityOnTimeDto extends RateDto {
  @ApiProperty()
  modalityCode: string;

  @ApiProperty()
  modalityName: string;
}

export class SellerMetricsResponseDto {
  @ApiProperty({ description: 'DELIVERED shipments created in the window' })
  delivered: number;

  @ApiProperty({
    type: OnTimeTrendDto,
    description: 'deliveredAt ≤ dueAt among DELIVERED shipments with a dueAt',
  })
  onTime: OnTimeTrendDto;

  @ApiProperty({ type: [ModalityOnTimeDto] })
  byModality: ModalityOnTimeDto[];
}
