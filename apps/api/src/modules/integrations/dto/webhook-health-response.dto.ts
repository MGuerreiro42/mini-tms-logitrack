import { ApiProperty } from '@nestjs/swagger';

export const WEBHOOK_HEALTH_STATES = [
  'ok',
  'degraded',
  'down',
  'too_few',
  'not_configured',
] as const;

export class WebhookHealthResponseDto {
  @ApiProperty({
    enum: WEBHOOK_HEALTH_STATES,
    description:
      'down: the last 5 attempts failed; degraded: under 95 % of attempts succeeded; too_few: n < 5; not_configured: no active endpoint',
  })
  state: (typeof WEBHOOK_HEALTH_STATES)[number];

  @ApiProperty({
    description: 'Delivery attempts of the last 24 h, retries pending included',
  })
  n: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Succeeded ÷ all attempts × 100; null at n = 0',
  })
  successRate: number | null;

  @ApiProperty({ type: Number, nullable: true, description: 'Nearest rank' })
  p95Ms: number | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastSuccessAt: Date | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'When the failing run began; set only when down',
  })
  failingSince: Date | null;
}
