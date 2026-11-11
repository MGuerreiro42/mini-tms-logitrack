import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GlobalRole } from '../../../generated/prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { PulseResponseDto } from './dto/pulse-response.dto';
import { PulseService } from './pulse.service';

@ApiTags('admin')
@Controller('admin')
export class PulseController {
  constructor(private readonly pulseService: PulseService) {}

  @ApiOperation({
    summary:
      'Live platform pulse: events per minute, sockets, simulator, webhooks, queues and services; a part that fails reads null or false — admin only',
  })
  @ApiResponse({ status: 200, type: PulseResponseDto })
  @Auth(GlobalRole.ADMIN)
  @Get('pulse')
  pulse() {
    return this.pulseService.pulse();
  }
}
