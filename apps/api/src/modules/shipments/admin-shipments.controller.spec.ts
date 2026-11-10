import { Test, type TestingModule } from '@nestjs/testing';
import { AdminShipmentsController } from './admin-shipments.controller';
import { PulseService } from './pulse.service';
import { ShipmentsService } from './shipments.service';

describe('AdminShipmentsController', () => {
  let controller: AdminShipmentsController;
  const countsByStatusForAdmin = vi.fn();

  beforeEach(async () => {
    countsByStatusForAdmin.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminShipmentsController],
      providers: [
        {
          provide: ShipmentsService,
          useValue: { countsByStatusForAdmin },
        },
        { provide: PulseService, useValue: {} },
      ],
    }).compile();

    controller = module.get(AdminShipmentsController);
  });

  it('countsByStatus delegates to ShipmentsService.countsByStatusForAdmin with the filters', async () => {
    const counts = { PENDING: 1 };
    countsByStatusForAdmin.mockResolvedValue(counts);

    const result = await controller.countsByStatus({
      carrierId: 'carrier-1',
      sellerId: 'seller-1',
      window: '7d',
    });

    expect(countsByStatusForAdmin).toHaveBeenCalledWith(
      'carrier-1',
      'seller-1',
      '7d',
    );
    expect(result).toEqual(counts);
  });
});
