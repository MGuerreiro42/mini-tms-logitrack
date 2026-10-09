import { generateTrackingCode, TRACKING_CODE_PATTERN } from './tracking-code';

describe('tracking code', () => {
  it('generates codes that match the validation pattern', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateTrackingCode()).toMatch(TRACKING_CODE_PATTERN);
    }
  });
});
