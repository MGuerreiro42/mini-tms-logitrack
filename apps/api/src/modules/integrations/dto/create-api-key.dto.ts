import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export const API_KEY_NAME_MAX_LENGTH = 60;

export class CreateApiKeyDto {
  @ApiProperty({ example: 'ERP sync', maxLength: API_KEY_NAME_MAX_LENGTH })
  @IsString()
  @IsNotEmpty()
  @MaxLength(API_KEY_NAME_MAX_LENGTH)
  name: string;
}
