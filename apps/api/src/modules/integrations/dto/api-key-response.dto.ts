import { ApiProperty } from '@nestjs/swagger';

export class ApiKeyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'ERP sync' })
  name: string;

  @ApiProperty({
    example: 'tms_Q2x9bA1k',
    description: 'First characters of the key, to tell keys apart',
  })
  prefix: string;

  @ApiProperty({ type: Date, nullable: true })
  lastUsedAt: Date | null;

  @ApiProperty()
  createdAt: Date;
}

export class CreatedApiKeyResponseDto extends ApiKeyResponseDto {
  @ApiProperty({
    description: 'The full key, returned only once: it is stored hashed',
  })
  key: string;
}
