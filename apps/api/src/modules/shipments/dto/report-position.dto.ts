import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class ReportPositionDto {
  @ApiProperty({ minimum: -90, maximum: 90 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ minimum: -180, maximum: 180 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @ApiPropertyOptional({
    minimum: 0,
    maximum: 360,
    description: 'Compass heading in degrees, clockwise from north',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  heading?: number;

  // Window checked in the service, so the simulator's direct calls are held to it too.
  @ApiProperty({
    type: String,
    format: 'date-time',
    description:
      'When the device took the reading — at most 10 minutes old and 5 seconds ahead of the server clock',
  })
  @Type(() => Date)
  @IsDate()
  recordedAt: Date;
}

export class ReportPositionResponseDto {
  @ApiProperty({
    description:
      'False when a newer position was already stored; the ping is accepted but ignored',
  })
  applied: boolean;
}
