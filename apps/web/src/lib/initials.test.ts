import { initialsFor } from './initials';

describe('initialsFor', () => {
  it('takes the first letter of the first two words, uppercased', () => {
    expect(initialsFor('Fast Freight')).toBe('FF');
  });

  it('uses a single letter for a one-word name', () => {
    expect(initialsFor('Acme')).toBe('A');
  });

  it('ignores extra whitespace between words', () => {
    expect(initialsFor('  Fast   Freight  ')).toBe('FF');
  });

  it('ignores words after the first two', () => {
    expect(initialsFor('Fast Freight Logistics LLC')).toBe('FF');
  });

  it('returns an empty string for an empty name', () => {
    expect(initialsFor('')).toBe('');
  });
});
