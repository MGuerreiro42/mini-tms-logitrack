import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { toUpperTrimmed } from '../../../shared/transforms/normalize';

export class CoverageAreaInputDto {
  @ApiProperty({ example: 'SP' })
  // Uppercased so the coverage lookup stays a plain, indexable equality.
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
