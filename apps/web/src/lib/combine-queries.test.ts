import { combineQueries } from './combine-queries';

function result<T>(data: T | undefined, error: unknown = null) {
  return { data, error, refetch: vi.fn() };
}

describe('combineQueries', () => {
  it('has no data until every query has resolved', () => {
    const combined = combineQueries([result(1), result(undefined)], ([a, b]) =>
      String(a + b),
    );
    expect(combined.data).toBeUndefined();
  });

  it('selects over the resolved data tuple', () => {
    const combined = combineQueries([result(1), result(2)], ([a, b]) => a + b);
    expect(combined.data).toBe(3);
  });

  it('surfaces the first error and refetches every query', () => {
    const failing = result(undefined, new Error('boom'));
    const ok = result(1);
    const combined = combineQueries([ok, failing], ([a]) => a);

    expect(combined.error).toEqual(new Error('boom'));
    combined.refetch();
    expect(ok.refetch).toHaveBeenCalled();
    expect(failing.refetch).toHaveBeenCalled();
  });
});
