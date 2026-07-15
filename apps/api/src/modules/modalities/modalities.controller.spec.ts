import { Test, type TestingModule } from '@nestjs/testing';
import { ModalitiesController } from './modalities.controller';
import { ModalitiesService } from './modalities.service';

describe('ModalitiesController', () => {
  let controller: ModalitiesController;
  const findAll = vi.fn();

  beforeEach(async () => {
    findAll.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModalitiesController],
      providers: [{ provide: ModalitiesService, useValue: { findAll } }],
    }).compile();

    controller = module.get(ModalitiesController);
  });

  describe('findAll', () => {
    it('delegates to ModalitiesService.findAll', async () => {
      const modalities = [
        { id: 'modality-1', code: 'STANDARD', name: 'Standard', slaHours: 48 },
      ];
      findAll.mockResolvedValue(modalities);

      const result = await controller.findAll();

      expect(findAll).toHaveBeenCalledWith();
      expect(result).toEqual(modalities);
    });
  });
});
