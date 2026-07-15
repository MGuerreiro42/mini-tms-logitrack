import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DeliveryModalityResponseDto } from './dto/delivery-modality-response.dto';
import { ModalitiesService } from './modalities.service';

@ApiTags('modalities')
@Controller('delivery-modalities')
export class ModalitiesController {
  constructor(private readonly modalitiesService: ModalitiesService) {}

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'List the full delivery modality catalog (reference data, seeded — no write endpoint)',
  })
  @ApiResponse({ status: 200, type: [DeliveryModalityResponseDto] })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.modalitiesService.findAll();
  }
}
