import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { WebhookEvent } from '../../../../generated/prisma/client';

const URL_MAX_LENGTH = 2048;

export class UpdateWebhookEndpointDto {
  @ApiPropertyOptional({
    maxLength: URL_MAX_LENGTH,
    description:
      'https, resolving to a public address; or the inbox URL of this seller',
  })
  @IsOptional()
  @IsString()
  @MaxLength(URL_MAX_LENGTH)
  url?: string;

  @ApiPropertyOptional({ enum: WebhookEvent, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(WebhookEvent, { each: true })
  events?: WebhookEvent[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
