import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { RateDto } from './metrics-response.dto';

export class IncludeStatsQueryDto {
  @ApiPropertyOptional({
    enum: ['stats'],
    description: 'Adds 30-day delivery stats to each row',
  })
  @IsOptional()
  @IsIn(['stats'])
  include?: 'stats';
}

export class FailedRateDto {
  @ApiProperty({ description: 'Delivered or ever failed, created in 30 d' })
  n: number;

  @ApiProperty({ type: Number, nullable: true, description: 'null at n = 0' })
  rate: number | null;
}

export class SellerListStatsDto {
  @ApiProperty({ description: 'Shipments created in the last 30 d' })
  shipments: number;

  @ApiProperty({ type: RateDto })
  onTime: RateDto;
}

export class CarrierListStatsDto extends SellerListStatsDto {
  @ApiProperty({ type: FailedRateDto })
  failed: FailedRateDto;
}
