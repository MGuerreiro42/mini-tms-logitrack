import { act, renderHook } from '@testing-library/react';
import { useFilteredPagination } from './use-filtered-pagination';

describe('useFilteredPagination', () => {
  it('maps ALL to no filter in the query params', () => {
    const { result } = renderHook(() =>
      useFilteredPagination({ status: 'ALL', sellerId: 'seller-1' }),
    );

    expect(result.current.params).toEqual({
      status: undefined,
      sellerId: 'seller-1',
      page: 1,
      limit: 20,
    });
  });

  it('resets to page 1 when a filter changes', () => {
    const { result } = renderHook(() =>
      useFilteredPagination({ status: 'ALL' as string }),
    );

    act(() => result.current.setPage(3));
    expect(result.current.params.page).toBe(3);

    act(() => result.current.setFilter('status', 'PENDING'));
    expect(result.current.params).toMatchObject({ status: 'PENDING', page: 1 });
  });
});
