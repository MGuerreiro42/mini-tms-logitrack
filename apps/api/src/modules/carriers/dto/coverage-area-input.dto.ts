import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { toUpperTrimmed } from '../../../shared/transforms/normalize';

export class CoverageAreaInputDto {
  @ApiProperty({ example: 'SP' })
  // Uppercased on write, unlike city — a UF code has no legitimate display
  // casing to preserve (unlike a city name), so normalizing here means the
  // comparison in ShipmentsService can stay a plain, indexable equality
  // instead of a case-insensitive one.
  @Transform(toUpperTrimmed)
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiPropertyOptional({
    example: 'São Paulo',
    description: 'Omit/null to cover the entire state',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  city?: string;
}
