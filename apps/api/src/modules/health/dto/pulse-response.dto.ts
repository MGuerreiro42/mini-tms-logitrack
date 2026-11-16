import { ApiProperty } from '@nestjs/swagger';
import type { ChaosScenarioId } from '../../simulator/chaos-scenarios';
import { CHAOS_SCENARIO_IDS } from '../../simulator/chaos-scenarios';

export const SIMULATOR_STATES = ['off', 'running', 'idle'] as const;
export type SimulatorState = (typeof SIMULATOR_STATES)[number];

export class SocketCountsDto {
  @ApiProperty({ description: 'Signed-in sockets, every API instance' })
  internal: number;

  @ApiProperty({ description: 'Public tracking page sockets' })
  public: number;
}

export class WebhookPulseDto {
  @ApiProperty({ description: 'Finished deliveries created in the last hour' })
  n: number;

  @ApiProperty({ type: Number, nullable: true, description: 'null at n = 0' })
  successRate: number | null;

  @ApiProperty({ type: Number, nullable: true })
  p95Ms: number | null;
}

export class QueuePulseDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  waiting: number;

  @ApiProperty()
  failed: number;
}

export class ServicesPulseDto {
  @ApiProperty()
  database: boolean;

  @ApiProperty()
  redis: boolean;
}

export class ChaosPulseDto {
  @ApiProperty({ enum: CHAOS_SCENARIO_IDS })
  scenario: ChaosScenarioId;

  @ApiProperty()
  label: string;

  @ApiProperty()
  endsAt: string;
}

// Every part degrades on its own: null (or false for services) when it could not be read.
export class PulseResponseDto {
  @ApiProperty({
    type: [Number],
    nullable: true,
    description: 'Tracking events per minute, oldest first, last 15 minutes',
  })
  eventsPerMinute: number[] | null;

  @ApiProperty({ type: SocketCountsDto, nullable: true })
  sockets: SocketCountsDto | null;

  @ApiProperty({ enum: SIMULATOR_STATES, nullable: true })
  simulator: SimulatorState | null;

  @ApiProperty({ type: WebhookPulseDto, nullable: true })
  webhooks: WebhookPulseDto | null;

  @ApiProperty({
    type: [QueuePulseDto],
    description:
      'webhooks always, demo only with the simulator; a queue that could not be read is left out',
  })
  queues: QueuePulseDto[];

  @ApiProperty({ type: ServicesPulseDto })
  services: ServicesPulseDto;

  @ApiProperty({
    type: ChaosPulseDto,
    nullable: true,
    description:
      'The running Chaos Mode scenario; null when none runs, with the simulator off or when Redis could not be read',
  })
  chaos: ChaosPulseDto | null;
}
