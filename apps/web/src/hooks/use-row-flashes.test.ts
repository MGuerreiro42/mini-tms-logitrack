import { renderHook } from '@testing-library/react';
import { rowFlashClass, useRowFlashes } from './use-row-flashes';

interface Row {
  id: string;
  status: string;
}

const getKey = (row: Row) => row.id;
const getVersion = (row: Row) => row.status;

describe('useRowFlashes', () => {
  const render = (rows: Row[]) =>
    renderHook(({ data }) => useRowFlashes(data, getKey, getVersion), {
      initialProps: { data: rows },
    });

  it('flashes a row already on screen whose status changed', () => {
    const { result, rerender } = render([{ id: 'a', status: 'PENDING' }]);

    rerender({ data: [{ id: 'a', status: 'ACCEPTED' }] });

    expect(result.current.get('a')).toBe(1);
  });

  it('never flashes on first render or for rows that just appeared', () => {
    const { result, rerender } = render([{ id: 'a', status: 'PENDING' }]);

    rerender({ data: [{ id: 'b', status: 'ACCEPTED' }] });

    expect(result.current.size).toBe(0);
  });

  it('alternates the animation so a second change replays it', () => {
    expect(rowFlashClass()).toBeUndefined();
    expect(rowFlashClass(1)).toBe('animate-row-flash-a');
    expect(rowFlashClass(2)).toBe('animate-row-flash-b');
  });
});
