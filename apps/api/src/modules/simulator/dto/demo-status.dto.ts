import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import type { ChaosRun, ChaosState } from '../chaos.service';
import {
  CHAOS_DURATIONS_SEC,
  CHAOS_SCENARIO_IDS,
  CHAOS_SCENARIOS,
  type ChaosScenarioId,
} from '../chaos-scenarios';

const CHAOS_END_REASONS = ['expired', 'admin', 'reset'] as const;

export class StartChaosDto {
  @ApiProperty({ enum: CHAOS_SCENARIO_IDS })
  @IsIn(CHAOS_SCENARIO_IDS)
  scenario: ChaosScenarioId;

  @ApiPropertyOptional({ enum: CHAOS_DURATIONS_SEC, default: 180 })
  @IsOptional()
  @IsIn(CHAOS_DURATIONS_SEC)
  durationSec?: number;
}

export class ChaosScenarioDto {
  @ApiProperty({ enum: CHAOS_SCENARIO_IDS })
  id: ChaosScenarioId;

  @ApiProperty()
  label: string;

  @ApiProperty()
  description: string;
}

// What every signed-in client may read about the running scenario.
export class ChaosStatusDto {
  @ApiProperty({ enum: CHAOS_SCENARIO_IDS })
  scenario: ChaosScenarioId;

  @ApiProperty()
  label: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  endsAt: string;
}

export class AdminChaosDto extends ChaosStatusDto {
  @ApiProperty()
  startedAt: string;

  @ApiProperty({ description: "The starting admin's e-mail" })
  startedBy: string;
}

export class ChaosRunDto {
  @ApiProperty({ enum: CHAOS_SCENARIO_IDS })
  scenario: ChaosScenarioId;

  @ApiProperty()
  startedAt: string;

  @ApiProperty()
  endedAt: string;

  @ApiProperty({ enum: CHAOS_END_REASONS })
  reason: ChaosRun['reason'];
}

export class DemoStatusDto {
  @ApiProperty({ type: ChaosStatusDto, nullable: true })
  chaos: ChaosStatusDto | null;

  @ApiProperty({ type: Date, nullable: true })
  nextResetAt: Date | null;
}

export class AdminDemoDto {
  @ApiProperty({ type: Date, nullable: true })
  lastResetAt: Date | null;

  @ApiProperty({ type: Date, nullable: true })
  nextResetAt: Date | null;

  @ApiProperty({ type: AdminChaosDto, nullable: true })
  chaos: AdminChaosDto | null;

  @ApiProperty({
    type: Date,
    nullable: true,
    description: 'null when Start is allowed',
  })
  cooldownUntil: Date | null;

  @ApiProperty({ type: [ChaosScenarioDto] })
  scenarios: ChaosScenarioDto[];

  @ApiProperty({
    type: [ChaosRunDto],
    description: 'The 5 newest, newest first',
  })
  runs: ChaosRunDto[];
}

export const toChaosStatusDto = ({
  scenario,
  endsAt,
}: ChaosState): ChaosStatusDto => {
  const { label, description } = CHAOS_SCENARIOS.find(
    ({ id }) => id === scenario,
  ) as ChaosScenarioDto;
  return { scenario, label, description, endsAt };
};

export const toAdminChaosDto = (state: ChaosState): AdminChaosDto => ({
  ...toChaosStatusDto(state),
  startedAt: state.startedAt,
  startedBy: state.startedBy,
});
