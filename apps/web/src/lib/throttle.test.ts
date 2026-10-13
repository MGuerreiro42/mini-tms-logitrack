import { throttle } from './throttle';

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs the first call immediately', () => {
    const fn = vi.fn();
    throttle(fn, 300)();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('collapses a burst into one trailing call', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 300);

    for (let i = 0; i < 10; i++) throttled();
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('runs immediately again once the window has passed', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 300);

    throttled();
    vi.advanceTimersByTime(300);
    throttled();

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('drops the pending trailing call on cancel', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 300);

    throttled();
    throttled();
    throttled.cancel();
    vi.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledTimes(1);
  });
});
