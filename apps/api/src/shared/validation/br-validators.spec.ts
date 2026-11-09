import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { IsCep, IsTaxId, IsUf, isCnpj, isCpf } from './br-validators';

describe('isCpf', () => {
  it('accepts valid check digits', () => {
    expect(isCpf('52998224725')).toBe(true);
  });

  it.each([
    '52998224724',
    '5299822472',
    '529982247250',
    '11111111111',
    '529.982.247-25',
  ])('rejects %s', (value) => {
    expect(isCpf(value)).toBe(false);
  });
});

describe('isCnpj', () => {
  it.each(['11222333000181', '44555666000181'])('accepts %s', (value) => {
    expect(isCnpj(value)).toBe(true);
  });

  it.each(['11222333000182', '1122233300018', '00000000000000'])(
    'rejects %s',
    (value) => {
      expect(isCnpj(value)).toBe(false);
    },
  );
});

class AddressFixture {
  @IsUf()
  state: string;

  @IsCep()
  zip: string;
}

class SignupFixture {
  @IsTaxId({ cpf: true, cnpj: true })
  sellerDocument: string;

  @IsTaxId({ cnpj: true })
  carrierDocument: string;
}

const check = <T extends object>(cls: new () => T, plain: object) => {
  const instance = plainToInstance(cls, plain);
  return {
    instance,
    failed: validateSync(instance).map((error) => error.property),
  };
};

describe('BR validators', () => {
  it('normalizes a UF and a CEP', () => {
    const { instance, failed } = check(AddressFixture, {
      state: ' sp ',
      zip: '01310 - 100',
    });
    expect(failed).toEqual([]);
    expect(instance).toMatchObject({ state: 'SP', zip: '01310100' });
  });

  it('rejects an unknown UF and a malformed CEP', () => {
    expect(check(AddressFixture, { state: 'zz', zip: 'abc' }).failed).toEqual([
      'state',
      'zip',
    ]);
    expect(
      check(AddressFixture, { state: 'SP', zip: '0131010' }).failed,
    ).toEqual(['zip']);
  });

  it('strips punctuation from a tax ID and checks the kinds accepted', () => {
    const { instance, failed } = check(SignupFixture, {
      sellerDocument: '529.982.247-25',
      carrierDocument: '11.222.333/0001-81',
    });
    expect(failed).toEqual([]);
    expect(instance).toMatchObject({
      sellerDocument: '52998224725',
      carrierDocument: '11222333000181',
    });

    expect(
      check(SignupFixture, {
        sellerDocument: '11.222.333/0001-82',
        carrierDocument: '529.982.247-25',
      }).failed,
    ).toEqual(['sellerDocument', 'carrierDocument']);
  });
});
