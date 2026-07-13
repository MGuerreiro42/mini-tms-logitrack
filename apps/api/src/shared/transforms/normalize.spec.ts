import { toLowerTrimmed, toUpperTrimmed } from './normalize';

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
