import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { ModalitiesService } from './modalities.service';

describe('ModalitiesService', () => {
  let modalitiesService: ModalitiesService;
  const findMany = vi.fn();
  const count = vi.fn();

  beforeEach(async () => {
    findMany.mockReset();
    count.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModalitiesService,
        {
          provide: PrismaService,
          useValue: { deliveryModality: { findMany, count } },
        },
      ],
    }).compile();

    modalitiesService = module.get(ModalitiesService);
  });

  describe('findAll', () => {
    it('returns the delivery modality catalog ordered by code', async () => {
      const modalities = [
        { id: 'modality-1', code: 'STANDARD', name: 'Standard', slaHours: 48 },
        { id: 'modality-2', code: 'EXPRESS', name: 'Express', slaHours: 24 },
      ];
      findMany.mockResolvedValue(modalities);

      const result = await modalitiesService.findAll();

      expect(findMany).toHaveBeenCalledWith({
        orderBy: { code: 'asc' },
        select: { id: true, code: true, name: true, slaHours: true },
      });
      expect(result).toEqual(modalities);
    });
  });

  describe('assertAllExist', () => {
    it('accepts ids that are all in the catalog, counting duplicates once', async () => {
      count.mockResolvedValue(1);

      await expect(
        modalitiesService.assertAllExist(['modality-1', 'modality-1']),
      ).resolves.toBeUndefined();
      expect(count).toHaveBeenCalledWith({
        where: { id: { in: ['modality-1', 'modality-1'] } },
      });
    });

    it('throws BadRequestException when an id is not in the catalog', async () => {
      count.mockResolvedValue(1);

      await expect(
        modalitiesService.assertAllExist(['modality-1', 'missing']),
      ).rejects.toThrow(BadRequestException);
    });

    it('skips the lookup for an empty list', async () => {
      await modalitiesService.assertAllExist([]);

      expect(count).not.toHaveBeenCalled();
    });
  });

  describe('findToggles', () => {
    it('flags each catalog modality as enabled or not, ordered by code', async () => {
      findMany.mockResolvedValue([
        { id: 'modality-2', code: 'EXPRESS', name: 'Express', slaHours: 24 },
        { id: 'modality-1', code: 'STANDARD', name: 'Standard', slaHours: 48 },
      ]);

      const result = await modalitiesService.findToggles(['modality-1']);

      expect(findMany).toHaveBeenCalledWith({ orderBy: { code: 'asc' } });
      expect(result).toEqual([
        { id: 'modality-2', code: 'EXPRESS', name: 'Express', enabled: false },
        { id: 'modality-1', code: 'STANDARD', name: 'Standard', enabled: true },
      ]);
    });
  });
});
