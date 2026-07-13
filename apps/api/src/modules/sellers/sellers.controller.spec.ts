import { Test, type TestingModule } from '@nestjs/testing';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { SellersController } from './sellers.controller';
import { SellersService } from './sellers.service';

describe('SellersController', () => {
  let controller: SellersController;
  const signup = vi.fn();
  const findByUserId = vi.fn();
  const getModalities = vi.fn();
  const setModalities = vi.fn();
  const findAll = vi.fn();
  const findOne = vi.fn();
  const approve = vi.fn();
  const reject = vi.fn();

  const user: AuthenticatedUser = {
    id: 'user-1',
    email: 'seller@example.com',
    role: 'SELLER',
  };

  beforeEach(async () => {
    for (const fn of [
      signup,
      findByUserId,
      getModalities,
      setModalities,
      findAll,
      findOne,
      approve,
      reject,
    ]) {
      fn.mockReset();
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SellersController],
      providers: [
        {
          provide: SellersService,
          useValue: {
            signup,
            findByUserId,
            getModalities,
            setModalities,
            findAll,
            findOne,
            approve,
            reject,
          },
        },
      ],
    }).compile();

    controller = module.get(SellersController);
  });

  it('signup delegates to SellersService.signup with the DTO', async () => {
    const dto = {
      email: 'seller@example.com',
      password: 'password123',
      companyName: 'Example Store',
      document: '12345678000199',
    };
    signup.mockResolvedValue({ id: 'seller-1' });

    const result = await controller.signup(dto);

    expect(signup).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 'seller-1' });
  });

  it('findMine delegates to SellersService.findByUserId with the current user id', async () => {
    findByUserId.mockResolvedValue({ id: 'seller-1' });

    const result = await controller.findMine(user);

    expect(findByUserId).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ id: 'seller-1' });
  });

  it('getModalities delegates to SellersService.getModalities with the current user id', async () => {
    getModalities.mockResolvedValue([{ id: 'modality-1', enabled: true }]);

    const result = await controller.getModalities(user);

    expect(getModalities).toHaveBeenCalledWith('user-1');
    expect(result).toEqual([{ id: 'modality-1', enabled: true }]);
  });

  it('setModalities delegates to SellersService.setModalities with the user id and modalityIds', async () => {
    setModalities.mockResolvedValue([{ id: 'modality-1', enabled: true }]);

    const result = await controller.setModalities(user, {
      modalityIds: ['modality-1'],
    });

    expect(setModalities).toHaveBeenCalledWith('user-1', ['modality-1']);
    expect(result).toEqual([{ id: 'modality-1', enabled: true }]);
  });

  it('findAll delegates to SellersService.findAll with the query params', async () => {
    findAll.mockResolvedValue({ data: [], meta: {} });

    const result = await controller.findAll({
      status: 'PENDING',
      page: 2,
      limit: 10,
    });

    expect(findAll).toHaveBeenCalledWith('PENDING', 2, 10);
    expect(result).toEqual({ data: [], meta: {} });
  });

  it('findOne delegates to SellersService.findOne with the id param', async () => {
    findOne.mockResolvedValue({ id: 'seller-1' });

    const result = await controller.findOne('seller-1');

    expect(findOne).toHaveBeenCalledWith('seller-1');
    expect(result).toEqual({ id: 'seller-1' });
  });

  it('approve delegates to SellersService.approve with the id param', async () => {
    approve.mockResolvedValue({ id: 'seller-1', status: 'APPROVED' });

    const result = await controller.approve('seller-1');

    expect(approve).toHaveBeenCalledWith('seller-1');
    expect(result).toEqual({ id: 'seller-1', status: 'APPROVED' });
  });

  it('reject delegates to SellersService.reject with the id param', async () => {
    reject.mockResolvedValue({ id: 'seller-1', status: 'REJECTED' });

    const result = await controller.reject('seller-1');

    expect(reject).toHaveBeenCalledWith('seller-1');
    expect(result).toEqual({ id: 'seller-1', status: 'REJECTED' });
  });
});
