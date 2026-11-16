import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/decorators/auth.decorator';
import { ChaosService } from './chaos.service';
import { DemoStatusDto, toChaosStatusDto } from './dto/demo-status.dto';
import { SimulatorScheduler } from './simulator.scheduler';

@ApiTags('demo')
@Controller('demo')
export class DemoController {
  constructor(
    private readonly chaosService: ChaosService,
    private readonly simulatorScheduler: SimulatorScheduler,
  ) {}

  @ApiOperation({
    summary: 'The running Chaos Mode scenario, if any, and the next reset',
  })
  @ApiResponse({ status: 200, type: DemoStatusDto })
  @Auth()
  @Get('status')
  async status(): Promise<DemoStatusDto> {
    const [chaos, nextResetAt] = await Promise.all([
      this.chaosService.active(),
      this.simulatorScheduler.nextResetAt(),
    ]);
    return { chaos: chaos && toChaosStatusDto(chaos), nextResetAt };
  }
}
