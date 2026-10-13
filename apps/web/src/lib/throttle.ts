export interface Throttled {
  (): void;
  cancel: () => void;
}

export function throttle(fn: () => void, waitMs: number): Throttled {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending = false;

  function run() {
    fn();
    timer = setTimeout(() => {
      timer = undefined;
      if (!pending) return;
      pending = false;
      run();
    }, waitMs);
  }

  function throttled() {
    if (timer === undefined) run();
    else pending = true;
  }

  throttled.cancel = () => {
    clearTimeout(timer);
    timer = undefined;
    pending = false;
  };

  return throttled;
}
