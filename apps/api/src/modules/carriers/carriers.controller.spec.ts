import { Test, type TestingModule } from '@nestjs/testing';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CarriersController } from './carriers.controller';
import { CarriersService } from './carriers.service';

describe('CarriersController', () => {
  let controller: CarriersController;
  const signup = vi.fn();
  const findByUserId = vi.fn();
  const getModalities = vi.fn();
  const setModalities = vi.fn();
  const getCoverageAreas = vi.fn();
  const setCoverageAreas = vi.fn();
  const findAll = vi.fn();
  const findOne = vi.fn();
  const approve = vi.fn();
  const reject = vi.fn();

  const user: AuthenticatedUser = {
    id: 'user-1',
    email: 'manager@carrier.example.com',
    role: 'CARRIER_MANAGER',
  };

  beforeEach(async () => {
    for (const fn of [
      signup,
      findByUserId,
      getModalities,
      setModalities,
      getCoverageAreas,
      setCoverageAreas,
      findAll,
      findOne,
      approve,
      reject,
    ]) {
      fn.mockReset();
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CarriersController],
      providers: [
        {
          provide: CarriersService,
          useValue: {
            signup,
            findByUserId,
            getModalities,
            setModalities,
            getCoverageAreas,
            setCoverageAreas,
            findAll,
            findOne,
            approve,
            reject,
          },
        },
      ],
    }).compile();

    controller = module.get(CarriersController);
  });

  it('signup delegates to CarriersService.signup with the DTO', async () => {
    const dto = {
      email: 'manager@carrier.example.com',
      password: 'password123',
      companyName: 'Fast Freight',
      document: '12345678000199',
    };
    signup.mockResolvedValue({ id: 'carrier-1' });

    const result = await controller.signup(dto);

    expect(signup).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 'carrier-1' });
  });

  it('findMine delegates to CarriersService.findByUserId with the current user id', async () => {
    findByUserId.mockResolvedValue({ id: 'carrier-1' });

    const result = await controller.findMine(user);

    expect(findByUserId).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ id: 'carrier-1' });
  });

  it('getModalities delegates to CarriersService.getModalities with the current user id', async () => {
    getModalities.mockResolvedValue([{ id: 'modality-1', enabled: true }]);

    const result = await controller.getModalities(user);

    expect(getModalities).toHaveBeenCalledWith('user-1');
    expect(result).toEqual([{ id: 'modality-1', enabled: true }]);
  });

  it('setModalities delegates to CarriersService.setModalities with the user id and modalityIds', async () => {
    setModalities.mockResolvedValue([{ id: 'modality-1', enabled: true }]);

    const result = await controller.setModalities(user, {
      modalityIds: ['modality-1'],
    });

    expect(setModalities).toHaveBeenCalledWith('user-1', ['modality-1']);
    expect(result).toEqual([{ id: 'modality-1', enabled: true }]);
  });

  it('getCoverageAreas delegates to CarriersService.getCoverageAreas with the current user id', async () => {
    getCoverageAreas.mockResolvedValue([{ id: 'area-1', state: 'SP' }]);

    const result = await controller.getCoverageAreas(user);

    expect(getCoverageAreas).toHaveBeenCalledWith('user-1');
    expect(result).toEqual([{ id: 'area-1', state: 'SP' }]);
  });

  it('setCoverageAreas delegates to CarriersService.setCoverageAreas with the user id and areas', async () => {
    setCoverageAreas.mockResolvedValue([{ id: 'area-1', state: 'SP' }]);

    const result = await controller.setCoverageAreas(user, {
      areas: [{ state: 'SP', city: 'São Paulo' }],
    });

    expect(setCoverageAreas).toHaveBeenCalledWith('user-1', [
      { state: 'SP', city: 'São Paulo' },
    ]);
    expect(result).toEqual([{ id: 'area-1', state: 'SP' }]);
  });

  it('findAll delegates to CarriersService.findAll with the query params', async () => {
    findAll.mockResolvedValue({ data: [], meta: {} });

    const result = await controller.findAll({
      status: 'PENDING',
      page: 2,
      limit: 10,
    });

    expect(findAll).toHaveBeenCalledWith('PENDING', 2, 10);
    expect(result).toEqual({ data: [], meta: {} });
  });

  it('findOne delegates to CarriersService.findOne with the id param', async () => {
    findOne.mockResolvedValue({ id: 'carrier-1' });

    const result = await controller.findOne('carrier-1');

    expect(findOne).toHaveBeenCalledWith('carrier-1');
    expect(result).toEqual({ id: 'carrier-1' });
  });

  it('approve delegates to CarriersService.approve with the id param', async () => {
    approve.mockResolvedValue({ id: 'carrier-1', status: 'APPROVED' });

    const result = await controller.approve('carrier-1');

    expect(approve).toHaveBeenCalledWith('carrier-1');
    expect(result).toEqual({ id: 'carrier-1', status: 'APPROVED' });
  });

  it('reject delegates to CarriersService.reject with the id param', async () => {
    reject.mockResolvedValue({ id: 'carrier-1', status: 'REJECTED' });

    const result = await controller.reject('carrier-1');

    expect(reject).toHaveBeenCalledWith('carrier-1');
    expect(result).toEqual({ id: 'carrier-1', status: 'REJECTED' });
  });
});
