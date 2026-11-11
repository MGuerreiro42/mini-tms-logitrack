import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GlobalRole } from '../../../generated/prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ChaosService } from './chaos.service';
import { CHAOS_SCENARIOS, DEFAULT_CHAOS_DURATION_SEC } from './chaos-scenarios';
import { DemoResetService } from './demo-reset.service';
import {
  AdminChaosDto,
  AdminDemoDto,
  StartChaosDto,
  toAdminChaosDto,
} from './dto/demo-status.dto';
import { SimulatorScheduler } from './simulator.scheduler';

const RUNS_SHOWN = 5;

@ApiTags('admin')
@Auth(GlobalRole.ADMIN)
@Controller('admin/demo')
export class DemoResetController {
  constructor(
    private readonly simulatorScheduler: SimulatorScheduler,
    private readonly demoResetService: DemoResetService,
    private readonly chaosService: ChaosService,
  ) {}

  @ApiOperation({
    summary: 'Reset schedule, Chaos Mode state and catalog, and the last runs',
  })
  @ApiResponse({ status: 200, type: AdminDemoDto })
  @Get()
  async overview(): Promise<AdminDemoDto> {
    const [lastResetAt, nextResetAt, chaos, cooldownUntil, runs] =
      await Promise.all([
        this.demoResetService.lastResetAt(),
        this.simulatorScheduler.nextResetAt(),
        this.chaosService.active(),
        this.chaosService.cooldownUntil(),
        this.chaosService.runs(RUNS_SHOWN),
      ]);
    return {
      lastResetAt,
      nextResetAt,
      chaos: chaos && toAdminChaosDto(chaos),
      cooldownUntil,
      scenarios: [...CHAOS_SCENARIOS],
      runs,
    };
  }

  @ApiOperation({
    summary: 'Restore the demo tenant to a fresh seed',
    description:
      'Runs the same job as the daily reset and answers once it has finished.',
  })
  @ApiResponse({ status: 204, description: 'Demo tenant reset' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('reset')
  reset(): Promise<void> {
    return this.simulatorScheduler.resetNow();
  }

  @ApiOperation({ summary: 'Start a Chaos Mode scenario on the demo tenant' })
  @ApiResponse({ status: 201, type: AdminChaosDto })
  @ApiResponse({
    status: 409,
    description: 'A scenario is running or Chaos Mode is cooling down',
  })
  @Post('chaos')
  async startChaos(
    @Body() dto: StartChaosDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdminChaosDto> {
    const state = await this.chaosService.start(
      dto.scenario,
      dto.durationSec ?? DEFAULT_CHAOS_DURATION_SEC,
      user.email,
    );
    return toAdminChaosDto(state);
  }

  @ApiOperation({ summary: 'End the running scenario now' })
  @ApiResponse({ status: 204, description: 'Scenario ended' })
  @ApiResponse({ status: 404, description: 'No scenario is running' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('chaos')
  async endChaos(): Promise<void> {
    if (!(await this.chaosService.endNow())) {
      throw new NotFoundException('No scenario is running');
    }
  }
}
