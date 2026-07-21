import { sumRecord } from './sum-record';

describe('sumRecord', () => {
  it('adds up every value in the record', () => {
    expect(sumRecord({ PENDING: 2, DELIVERED: 5 })).toBe(7);
  });

  it('returns 0 for an empty record', () => {
    expect(sumRecord({})).toBe(0);
  });
});
