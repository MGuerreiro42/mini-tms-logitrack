import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateWebhookInboxDto {
  @ApiProperty({ description: 'Answer 500 to every request, to watch retries' })
  @IsBoolean()
  failRequests: boolean;
}
