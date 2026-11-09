import { listCodes } from './use-bulk-cancel';

describe('listCodes', () => {
  it.each([
    [['TMS-1'], 'TMS-1'],
    [['TMS-1', 'TMS-2', 'TMS-3'], 'TMS-1, TMS-2, TMS-3'],
    [['TMS-1', 'TMS-2', 'TMS-3', 'TMS-4'], 'TMS-1, TMS-2 and 2 more'],
  ])('lists %j as %s', (codes, text) => {
    expect(listCodes(codes)).toBe(text);
  });
});
