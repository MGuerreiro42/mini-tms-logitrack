import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelShipmentDto {
  @ApiPropertyOptional({ maxLength: 500, example: 'Customer gave up' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
