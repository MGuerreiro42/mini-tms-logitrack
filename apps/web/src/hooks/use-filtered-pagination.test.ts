import { act, renderHook } from '@testing-library/react';
import { currentUrl, resetNavigation, router } from '@/test/navigation';
import { useFilteredPagination } from './use-filtered-pagination';

function setup(href: string) {
  resetNavigation(href);
  return renderHook(() =>
    useFilteredPagination(
      { status: 'ALL' as string, sellerId: 'ALL' as string },
      { status: ['ALL', 'PENDING'], sellerId: ['ALL', 'seller-1'] },
    ),
  );
}

describe('useFilteredPagination', () => {
  it('maps ALL to no filter in the query params', () => {
    const { result } = setup('/admin/monitoring');

    expect(result.current.params).toEqual({
      status: undefined,
      sellerId: undefined,
      page: 1,
      limit: 20,
    });
  });

  it('reads filters and page from the URL', () => {
    const { result } = setup('/admin/monitoring?status=PENDING&page=3');

    expect(result.current.filters).toEqual({
      status: 'PENDING',
      sellerId: 'ALL',
    });
    expect(result.current.params).toMatchObject({ status: 'PENDING', page: 3 });
  });

  it('falls back to the default for a value outside the allowed set and cleans the URL', () => {
    const { result } = setup(
      '/admin/monitoring?status=BOGUS&sellerId=seller-1&page=4',
    );

    expect(result.current.filters).toEqual({
      status: 'ALL',
      sellerId: 'seller-1',
    });
    expect(result.current.params).toMatchObject({
      status: undefined,
      sellerId: 'seller-1',
      page: 1,
    });
    expect(currentUrl()).toBe('/admin/monitoring?sellerId=seller-1');
  });

  it('leaves a valid URL untouched', () => {
    setup('/admin/monitoring?status=PENDING&page=3');

    expect(router.replace).not.toHaveBeenCalled();
  });

  it('falls back to page 1 for an invalid page param', () => {
    const { result } = setup('/admin/monitoring?page=-2');

    expect(result.current.params.page).toBe(1);
  });

  it('writes a filter to the URL and resets the page', () => {
    const { result } = setup('/admin/monitoring?sellerId=seller-1&page=3');

    act(() => result.current.setFilter('status', 'PENDING'));

    expect(currentUrl()).toBe(
      '/admin/monitoring?sellerId=seller-1&status=PENDING',
    );
    expect(router.replace).toHaveBeenCalledWith(currentUrl(), {
      scroll: false,
    });
    expect(result.current.params).toMatchObject({ status: 'PENDING', page: 1 });
  });

  it('drops a filter from the URL when it returns to its default', () => {
    const { result } = setup('/admin/monitoring?status=PENDING');

    act(() => result.current.setFilter('status', 'ALL'));

    expect(currentUrl()).toBe('/admin/monitoring');
  });

  it('keeps the filters when the page changes', () => {
    const { result } = setup('/admin/monitoring?status=PENDING');

    act(() => result.current.setPage(2));
    expect(currentUrl()).toBe('/admin/monitoring?status=PENDING&page=2');

    act(() => result.current.setPage(1));
    expect(currentUrl()).toBe('/admin/monitoring?status=PENDING');
  });

  it('reports whether any filter differs from its default', () => {
    expect(setup('/admin/monitoring').result.current.isFiltered).toBe(false);
    expect(
      setup('/admin/monitoring?status=PENDING').result.current.isFiltered,
    ).toBe(true);
  });

  it('clears every filter and the page but keeps unrelated params', () => {
    const { result } = setup(
      '/admin/monitoring?status=PENDING&sellerId=seller-1&page=2&tab=x',
    );

    act(() => result.current.clearFilters());

    expect(currentUrl()).toBe('/admin/monitoring?tab=x');
  });
});
