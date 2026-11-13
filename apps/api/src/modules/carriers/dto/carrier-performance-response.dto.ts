import { ApiProperty } from '@nestjs/swagger';
import {
  ClaimDto,
  FirstAttemptDto,
  MedianDeliveryDto,
  OnTimeTrendDto,
  StageResponseDto,
} from '../../shipments/metrics/metrics-response.dto';

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
