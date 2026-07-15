import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import type { DeliveryModalityResponseDto } from './dto/delivery-modality-response.dto';

@Injectable()
export class ModalitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<DeliveryModalityResponseDto[]> {
    return this.prisma.deliveryModality.findMany({
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true, slaHours: true },
    });
  }
}
