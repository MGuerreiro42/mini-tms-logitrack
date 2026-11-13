import { ApiProperty } from '@nestjs/swagger';
import { ShipmentStatus } from '../../../../generated/prisma/client';

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

// Medians and p90 are nearest-rank; every value is null without samples.
export class MedianDeliveryDto {
  @ApiProperty({ type: Number, nullable: true })
  hours: number | null;

  @ApiProperty({ type: Number, nullable: true })
  p90Hours: number | null;

  @ApiProperty()
  n: number;
}

export class FirstAttemptDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Outcomes without a FAILED_DELIVERY event ÷ n × 100',
  })
  rate: number | null;

  @ApiProperty({ description: 'Delivered or ever failed' })
  n: number;

  @ApiProperty()
  failed: number;

  @ApiProperty()
  returned: number;
}

export class ClaimDto {
  @ApiProperty({ type: Number, nullable: true })
  p50Minutes: number | null;

  @ApiProperty({ type: Number, nullable: true })
  p90Minutes: number | null;

  @ApiProperty()
  n: number;
}

export class StageResponseDto {
  @ApiProperty({
    enum: ShipmentStatus,
    description: 'The status a shipment sits in during the stage',
  })
  status: ShipmentStatus;

  @ApiProperty({ type: Number, nullable: true })
  p50Hours: number | null;

  @ApiProperty({ type: Number, nullable: true })
  p90Hours: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: "A fixed share of the window's median slaHours",
  })
  budgetHours: number | null;

  @ApiProperty()
  n: number;
}

export class StateOnTimeDto extends RateDto {
  @ApiProperty({ description: 'Destination UF' })
  uf: string;
}

export class VolumePointDto {
  @ApiProperty({ type: String, format: 'date-time' })
  start: Date;

  @ApiProperty()
  delivered: number;

  @ApiProperty({ description: 'FAILED_DELIVERY or RETURNED now' })
  problem: number;

  @ApiProperty()
  open: number;
}

export class VolumeDto {
  @ApiProperty({
    enum: ['day', 'week'],
    description: 'week for a window over 30 days',
  })
  bucket: 'day' | 'week';

  @ApiProperty({
    type: [VolumePointDto],
    description:
      'Shipments by createdAt from the window start, by status now; cancelled excluded',
  })
  points: VolumePointDto[];
}

export class ComparisonDto {
  @ApiProperty({ type: String, format: 'date-time' })
  since: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Start of the previous window of equal span, ending at since',
  })
  previousSince: Date;

  @ApiProperty({
    description:
      "At least 80 % of the current window's shipments are terminal or past dueAt",
  })
  mature: boolean;

  @ApiProperty({ type: RateDto, description: 'On time in the previous window' })
  onTime: RateDto;

  @ApiProperty({
    type: RateDto,
    description: 'First attempt in the previous window',
  })
  firstAttempt: RateDto;
}

export class SellerMetricsResponseDto {
  @ApiProperty({ description: 'Shipments created in the window' })
  shipments: number;

  @ApiProperty()
  cancelled: number;

  @ApiProperty({
    description:
      'DELIVERED shipments created in the window, rows without deliveredAt included, so it equals the list it opens',
  })
  delivered: number;

  @ApiProperty({
    type: OnTimeTrendDto,
    description: 'deliveredAt ≤ dueAt among DELIVERED shipments with a dueAt',
  })
  onTime: OnTimeTrendDto;

  @ApiProperty({ type: [ModalityOnTimeDto] })
  byModality: ModalityOnTimeDto[];

  @ApiProperty({ type: MedianDeliveryDto })
  medianDelivery: MedianDeliveryDto;

  @ApiProperty({ type: FirstAttemptDto })
  firstAttempt: FirstAttemptDto;

  @ApiProperty({ type: [StageResponseDto] })
  stages: StageResponseDto[];

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'Median slaHours of the window: the base of every stage budget',
  })
  slaMedianHours: number | null;

  @ApiProperty({ type: [StateOnTimeDto] })
  byState: StateOnTimeDto[];

  @ApiProperty({ type: VolumeDto })
  volume: VolumeDto;

  @ApiProperty({ type: ComparisonDto })
  comparison: ComparisonDto;
}
