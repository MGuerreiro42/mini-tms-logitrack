import {
  formatCep,
  formatCnpj,
  formatTaxId,
  isCep,
  isCnpj,
  isCpf,
  toDigits,
} from './br-documents';

describe('masks', () => {
  it.each([
    ['01310100', '01310-100'],
    ['01310-100', '01310-100'],
    ['0131', '0131'],
    ['013101', '01310-1'],
    ['013101009', '01310-100'],
    ['abc', ''],
  ])('formats the CEP %s as %s', (value, formatted) => {
    expect(formatCep(value)).toBe(formatted);
  });

  it.each([
    ['52998224725', '529.982.247-25'],
    ['5299822', '529.982.2'],
    ['11222333000181', '11.222.333/0001-81'],
    ['11.222.333/0001-81', '11.222.333/0001-81'],
  ])('formats the tax ID %s as %s', (value, formatted) => {
    expect(formatTaxId(value)).toBe(formatted);
  });

  it('masks a carrier CNPJ from the first digit', () => {
    expect(formatCnpj('112223')).toBe('11.222.3');
  });

  it('strips everything but digits', () => {
    expect(toDigits('11.222.333/0001-81')).toBe('11222333000181');
  });
});

describe('isCep', () => {
  it.each([
    ['01310-100', true],
    ['01310100', true],
    ['01310-10', false],
    ['', false],
  ])('reads %s as %s', (value, valid) => {
    expect(isCep(value)).toBe(valid);
  });
});

describe('isCpf', () => {
  it.each(['52998224725', '529.982.247-25', '11144477735'])(
    'accepts %s',
    (value) => {
      expect(isCpf(value)).toBe(true);
    },
  );

  it.each([
    '52998224724',
    '5299822472',
    '529982247250',
    '11111111111',
    '00000000000',
  ])('rejects %s', (value) => {
    expect(isCpf(value)).toBe(false);
  });
});

describe('isCnpj', () => {
  it.each(['11222333000181', '44555666000181', '11.222.333/0001-81'])(
    'accepts %s',
    (value) => {
      expect(isCnpj(value)).toBe(true);
    },
  );

  it.each([
    '11222333000182',
    '1122233300018',
    '00000000000000',
    '11111111111111',
    '52998224725',
  ])('rejects %s', (value) => {
    expect(isCnpj(value)).toBe(false);
  });
});
