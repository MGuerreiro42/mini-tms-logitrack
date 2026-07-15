import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PublicTrackingResponseDto } from './dto/public-tracking-response.dto';
import { ShipmentsService } from './shipments.service';

// No JwtAuthGuard/RolesGuard anywhere on this controller — deliberately, this
// is the one HTTP route in the app meant to be reachable with no session at
// all, just a shared trackingCode (SCREENS.md's Public Tracking screen).
@ApiTags('public-tracking')
@Controller('public/tracking')
export class PublicTrackingController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @ApiOperation({
    summary:
      'Track a shipment by its public trackingCode — no auth, narrower response than the authenticated shipment reads (no street address, no seller/carrier identity, no tracking event notes)',
  })
  @ApiResponse({ status: 200, type: PublicTrackingResponseDto })
  @ApiResponse({ status: 404, description: 'No shipment with this code' })
  @Get(':code')
  findByTrackingCode(@Param('code') code: string) {
    return this.shipmentsService.findPublicByTrackingCode(code);
  }
}
