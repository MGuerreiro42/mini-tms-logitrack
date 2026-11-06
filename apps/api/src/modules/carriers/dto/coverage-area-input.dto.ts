import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsUf } from '../../../shared/validation/br-validators';

export class CoverageAreaInputDto {
  @ApiProperty({ example: 'SP', description: 'One of the 27 UFs, any case' })
  @IsUf()
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
