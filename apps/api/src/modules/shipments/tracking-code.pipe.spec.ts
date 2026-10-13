import { NotFoundException } from '@nestjs/common';
import { generateTrackingCode } from './tracking-code';
import { TrackingCodePipe } from './tracking-code.pipe';

describe('TrackingCodePipe', () => {
  const pipe = new TrackingCodePipe();

  it('passes a well-formed tracking code through', () => {
    const code = generateTrackingCode();

    expect(pipe.transform(code)).toBe(code);
  });

  it.each([
    'not-a-code',
    'tms-abc123abc123',
    'TMS-ABC123',
    'TMS-ABC123ABC123 ',
  ])('throws NotFoundException for %j', (value) => {
    expect(() => pipe.transform(value)).toThrow(NotFoundException);
  });
});
