import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { ModalitiesService } from './modalities.service';

describe('ModalitiesService', () => {
  let modalitiesService: ModalitiesService;
  const findMany = vi.fn();

  beforeEach(async () => {
    findMany.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModalitiesService,
        {
          provide: PrismaService,
          useValue: { deliveryModality: { findMany } },
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
});
