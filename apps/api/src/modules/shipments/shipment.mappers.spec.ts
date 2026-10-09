import { pickAddress } from './shipment.mappers';

describe('pickAddress', () => {
  const address = {
    addressStreet: 'Av. Paulista',
    addressNumber: '1000',
    addressNeighborhood: 'Bela Vista',
    addressCity: 'São Paulo',
    addressState: 'SP',
    addressZipCode: '01310-100',
  };

  it('copies only the address fields', () => {
    expect(pickAddress({ ...address, id: 'x' } as typeof address)).toEqual({
      ...address,
      addressComplement: null,
    });
  });

  it('keeps a provided complement', () => {
    expect(
      pickAddress({ ...address, addressComplement: 'Apt 4' }).addressComplement,
    ).toBe('Apt 4');
  });
});
