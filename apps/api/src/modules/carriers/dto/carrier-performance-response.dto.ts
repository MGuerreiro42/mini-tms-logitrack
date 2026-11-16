import { ApiProperty } from '@nestjs/swagger';
import { ShipmentStatus } from '../../../../generated/prisma/client';
import { OnTimeTrendDto } from '../../shipments/metrics/metrics-response.dto';

// Medians and p90 are nearest-rank; every value is null without samples.
export class MedianDeliveryDto {
  @ApiProperty({ type: Number, nullable: true })
  hours: number | null;

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

export class CarrierPerformanceResponseDto {
  @ApiProperty({ description: 'Shipments created in the window' })
  totalShipments: number;

  @ApiProperty({ type: OnTimeTrendDto })
  onTime: OnTimeTrendDto;

  @ApiProperty({ type: MedianDeliveryDto })
  medianDelivery: MedianDeliveryDto;

  @ApiProperty({ type: FirstAttemptDto })
  firstAttempt: FirstAttemptDto;

  @ApiProperty({ type: ClaimDto })
  claim: ClaimDto;

  @ApiProperty({ type: [StageResponseDto] })
  stages: StageResponseDto[];
}
