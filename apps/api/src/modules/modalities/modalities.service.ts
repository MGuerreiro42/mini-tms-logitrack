import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import type { DeliveryModalityResponseDto } from './dto/delivery-modality-response.dto';
import type { ModalityToggleResponseDto } from './dto/modality-toggle-response.dto';

@Injectable()
export class ModalitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<DeliveryModalityResponseDto[]> {
    return this.prisma.deliveryModality.findMany({
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true, slaHours: true },
    });
  }

  async assertAllExist(modalityIds: string[]): Promise<void> {
    if (modalityIds.length === 0) return;

    const validCount = await this.prisma.deliveryModality.count({
      where: { id: { in: modalityIds } },
    });
    if (validCount !== new Set(modalityIds).size) {
      throw new BadRequestException(
        'One or more modalityIds do not exist in the DeliveryModality catalog',
      );
    }
  }

  async findToggles(
    enabledModalityIds: string[],
  ): Promise<ModalityToggleResponseDto[]> {
    const catalog = await this.prisma.deliveryModality.findMany({
      orderBy: { code: 'asc' },
    });
    const enabledIds = new Set(enabledModalityIds);
    return catalog.map((modality) => ({
      id: modality.id,
      code: modality.code,
      name: modality.name,
      enabled: enabledIds.has(modality.id),
    }));
  }
}
