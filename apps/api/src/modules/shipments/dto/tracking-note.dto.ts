import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export const TRACKING_NOTE_MAX_LENGTH = 500;

export class TrackingNoteDto {
  @ApiPropertyOptional({ maxLength: TRACKING_NOTE_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(TRACKING_NOTE_MAX_LENGTH)
  note?: string;
}
