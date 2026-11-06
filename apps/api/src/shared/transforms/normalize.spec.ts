import { cityKey, toDigits, toLowerTrimmed, toUpperTrimmed } from './normalize';

describe('toLowerTrimmed', () => {
  it('lowercases and trims a string', () => {
    expect(toLowerTrimmed({ value: '  Seller@Example.COM  ' })).toBe(
      'seller@example.com',
    );
  });

  it('returns non-string values untouched', () => {
    expect(toLowerTrimmed({ value: undefined })).toBeUndefined();
    expect(toLowerTrimmed({ value: null })).toBeNull();
    expect(toLowerTrimmed({ value: 42 })).toBe(42);
  });
});

describe('toUpperTrimmed', () => {
  it('uppercases and trims a string', () => {
    expect(toUpperTrimmed({ value: '  sp  ' })).toBe('SP');
  });

  it('returns non-string values untouched', () => {
    expect(toUpperTrimmed({ value: undefined })).toBeUndefined();
    expect(toUpperTrimmed({ value: null })).toBeNull();
    expect(toUpperTrimmed({ value: 42 })).toBe(42);
  });
});

describe('toDigits', () => {
  it('keeps only the digits of a string', () => {
    expect(toDigits({ value: '11.222.333/0001-81' })).toBe('11222333000181');
  });

  it('returns non-string values untouched', () => {
    expect(toDigits({ value: undefined })).toBeUndefined();
  });
});

describe('cityKey', () => {
  it('ignores case, accents and surrounding spaces', () => {
    expect(cityKey(' SÃO PAULO ')).toBe('sao paulo');
    expect(cityKey('Ribeirão Preto')).toBe(cityKey('ribeirao preto'));
    expect(cityKey('Niterói')).toBe('niteroi');
  });
});
