import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { StatsWindowQueryDto } from '../../../shared/stats/stats-window-query.dto';
import {
  ClaimDto,
  FirstAttemptDto,
  MedianDeliveryDto,
  OnTimeTrendDto,
  RateDto,
} from './metrics-response.dto';

export class AdminMetricsQueryDto extends StatsWindowQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  carrierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sellerId?: string;
}

export class CarrierOnTimeDto extends RateDto {
  @ApiProperty()
  carrierId: string;

  @ApiProperty()
  companyName: string;
}

export class AdminMetricsResponseDto {
  @ApiProperty({ description: 'Shipments created in the window' })
  shipments: number;

  @ApiProperty({ description: 'Open now, whatever the window' })
  active: number;

  @ApiProperty({ description: 'Open and past dueAt now, whatever the window' })
  lateNow: number;

  @ApiProperty({ type: OnTimeTrendDto })
  onTime: OnTimeTrendDto;

  @ApiProperty({ type: MedianDeliveryDto })
  medianDelivery: MedianDeliveryDto;

  @ApiProperty({ type: FirstAttemptDto })
  firstAttempt: FirstAttemptDto;

  @ApiProperty({ type: ClaimDto })
  claim: ClaimDto;

  @ApiProperty({
    type: [CarrierOnTimeDto],
    description: 'Every APPROVED carrier; empty when carrierId is given',
  })
  byCarrier: CarrierOnTimeDto[];
}
