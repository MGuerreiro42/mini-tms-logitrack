import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/decorators/auth.decorator';
import { DeliveryModalityResponseDto } from './dto/delivery-modality-response.dto';
import { ModalitiesService } from './modalities.service';

@ApiTags('modalities')
@Controller('delivery-modalities')
export class ModalitiesController {
  constructor(private readonly modalitiesService: ModalitiesService) {}

  @ApiOperation({
    summary:
      'List the full delivery modality catalog (reference data, seeded — no write endpoint)',
  })
  @ApiResponse({ status: 200, type: [DeliveryModalityResponseDto] })
  @Auth()
  @Get()
  findAll() {
    return this.modalitiesService.findAll();
  }
}
