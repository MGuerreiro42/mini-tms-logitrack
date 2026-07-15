import { Test, type TestingModule } from '@nestjs/testing';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ShipmentsController } from './shipments.controller';
import { ShipmentsService } from './shipments.service';

describe('ShipmentsController', () => {
  let controller: ShipmentsController;
  const findEligibleCarriers = vi.fn();
  const create = vi.fn();
  const findAllForSeller = vi.fn();
  const findOneForSeller = vi.fn();
  const findAllForCarrier = vi.fn();
  const findOneForCarrier = vi.fn();
  const claim = vi.fn();
  const updateStatus = vi.fn();

  const user: AuthenticatedUser = {
    id: 'user-1',
    email: 'seller@example.com',
    role: 'SELLER',
  };

  const carrierUser: AuthenticatedUser = {
    id: 'user-2',
    email: 'operator@example.com',
    role: 'CARRIER_OPERATOR',
  };

  beforeEach(async () => {
    findEligibleCarriers.mockReset();
    create.mockReset();
    findAllForSeller.mockReset();
    findOneForSeller.mockReset();
    findAllForCarrier.mockReset();
    findOneForCarrier.mockReset();
    claim.mockReset();
    updateStatus.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShipmentsController],
      providers: [
        {
          provide: ShipmentsService,
          useValue: {
            findEligibleCarriers,
            create,
            findAllForSeller,
            findOneForSeller,
            findAllForCarrier,
            findOneForCarrier,
            claim,
            updateStatus,
          },
        },
      ],
    }).compile();

    controller = module.get(ShipmentsController);
  });

  it('eligibleCarriers delegates to ShipmentsService.findEligibleCarriers with the query fields', async () => {
    findEligibleCarriers.mockResolvedValue([{ id: 'carrier-1' }]);

    const result = await controller.eligibleCarriers({
      state: 'SP',
      city: 'São Paulo',
      modalityId: 'modality-1',
    });

    expect(findEligibleCarriers).toHaveBeenCalledWith(
      'SP',
      'São Paulo',
      'modality-1',
    );
    expect(result).toEqual([{ id: 'carrier-1' }]);
  });

  it('create delegates to ShipmentsService.create with the user id and DTO', async () => {
    const dto = {
      addressStreet: 'Av. Paulista',
      addressNumber: '1000',
      addressNeighborhood: 'Bela Vista',
      addressCity: 'São Paulo',
      addressState: 'SP',
      addressZipCode: '01310-100',
      modalityId: 'modality-1',
      carrierId: 'carrier-1',
    };
    create.mockResolvedValue({ id: 'shipment-1' });

    const result = await controller.create(user, dto);

    expect(create).toHaveBeenCalledWith('user-1', dto);
    expect(result).toEqual({ id: 'shipment-1' });
  });

  it('findAll delegates to ShipmentsService.findAllForSeller with the user id and query params', async () => {
    findAllForSeller.mockResolvedValue({ data: [], meta: {} });

    const result = await controller.findAll(user, {
      status: 'PENDING',
      page: 2,
      limit: 10,
    });

    expect(findAllForSeller).toHaveBeenCalledWith('user-1', 'PENDING', 2, 10);
    expect(result).toEqual({ data: [], meta: {} });
  });

  it('findOne delegates to ShipmentsService.findOneForSeller with the user id and id param', async () => {
    findOneForSeller.mockResolvedValue({ id: 'shipment-1' });

    const result = await controller.findOne(user, 'shipment-1');

    expect(findOneForSeller).toHaveBeenCalledWith('user-1', 'shipment-1');
    expect(result).toEqual({ id: 'shipment-1' });
  });

  it('findQueue delegates to ShipmentsService.findAllForCarrier with the user id and query params', async () => {
    findAllForCarrier.mockResolvedValue({ data: [], meta: {} });

    const result = await controller.findQueue(carrierUser, {
      status: 'PENDING',
      page: 2,
      limit: 10,
    });

    expect(findAllForCarrier).toHaveBeenCalledWith('user-2', 'PENDING', 2, 10);
    expect(result).toEqual({ data: [], meta: {} });
  });

  it('findQueueOne delegates to ShipmentsService.findOneForCarrier with the user id and id param', async () => {
    findOneForCarrier.mockResolvedValue({ id: 'shipment-1' });

    const result = await controller.findQueueOne(carrierUser, 'shipment-1');

    expect(findOneForCarrier).toHaveBeenCalledWith('user-2', 'shipment-1');
    expect(result).toEqual({ id: 'shipment-1' });
  });

  it('claim delegates to ShipmentsService.claim with the user id and id param', async () => {
    claim.mockResolvedValue({ id: 'shipment-1', status: 'ACCEPTED' });

    const result = await controller.claim(carrierUser, 'shipment-1');

    expect(claim).toHaveBeenCalledWith('user-2', 'shipment-1');
    expect(result).toEqual({ id: 'shipment-1', status: 'ACCEPTED' });
  });

  it('updateStatus delegates to ShipmentsService.updateStatus with the user id, id param, and DTO', async () => {
    const dto = { status: 'COLLECTED' as const };
    updateStatus.mockResolvedValue({ id: 'shipment-1', status: 'COLLECTED' });

    const result = await controller.updateStatus(
      carrierUser,
      'shipment-1',
      dto,
    );

    expect(updateStatus).toHaveBeenCalledWith('user-2', 'shipment-1', dto);
    expect(result).toEqual({ id: 'shipment-1', status: 'COLLECTED' });
  });
});
