import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PublicTrackingResponseDto } from './dto/public-tracking-response.dto';
import { ShipmentsService } from './shipments.service';
import { TrackingCodePipe } from './tracking-code.pipe';

@ApiTags('public-tracking')
@Controller('public/tracking')
export class PublicTrackingController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @ApiOperation({
    summary:
      'Track a shipment by its public trackingCode — no auth, narrower response than the authenticated shipment reads (no street address, no seller/carrier identity, no tracking event notes)',
  })
  @ApiResponse({ status: 200, type: PublicTrackingResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Malformed code, or no shipment with it',
  })
  @Get(':code')
  findByTrackingCode(@Param('code', TrackingCodePipe) code: string) {
    return this.shipmentsService.findPublicByTrackingCode(code);
  }
}
