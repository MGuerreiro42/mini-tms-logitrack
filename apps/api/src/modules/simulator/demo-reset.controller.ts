import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GlobalRole } from '../../../generated/prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { SimulatorScheduler } from './simulator.scheduler';

@ApiTags('admin')
@Controller('admin/demo')
export class DemoResetController {
  constructor(private readonly simulatorScheduler: SimulatorScheduler) {}

  @ApiOperation({
    summary: 'Restore the demo tenant to a fresh seed',
    description:
      'Runs the same job as the daily reset and answers once it has finished.',
  })
  @ApiResponse({ status: 204, description: 'Demo tenant reset' })
  @Auth(GlobalRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('reset')
  reset(): Promise<void> {
    return this.simulatorScheduler.resetNow();
  }
}
