import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { APPROVAL_STATUS } from '@/lib/status-colors';
import { statusFilterOptions, ViewTabs } from './view-tabs';

describe('statusFilterOptions', () => {
  it('labels each status from its metadata and places All first', () => {
    expect(statusFilterOptions(APPROVAL_STATUS, ['PENDING'])).toEqual([
      { key: 'status', label: 'All', value: 'ALL', count: undefined },
      { key: 'status', label: 'Pending', value: 'PENDING', count: undefined },
    ]);
  });

  it('adds counts, with All summing them, and can place All last', () => {
    expect(
      statusFilterOptions(APPROVAL_STATUS, ['PENDING', 'REJECTED'], {
        counts: { PENDING: 2, REJECTED: 1 },
        allPosition: 'last',
      }),
    ).toEqual([
      { key: 'status', label: 'Pending', value: 'PENDING', count: 2 },
      { key: 'status', label: 'Rejected', value: 'REJECTED', count: 1 },
      { key: 'status', label: 'All', value: 'ALL', count: 3 },
    ]);
  });
});

const SELLER_TABS = [
  { key: 'view', label: 'All', value: 'ALL', count: 9 },
  { key: 'view', label: 'Exceptions', value: 'exceptions', count: 3 },
  { key: 'status', label: 'Delivered', value: 'DELIVERED' },
] as const;

describe('ViewTabs', () => {
  const renderTabs = (filters: Record<'view' | 'status', string>) => {
    const onChange = vi.fn();
    render(
      <ViewTabs
        options={[...SELLER_TABS]}
        filters={filters}
        onChange={onChange}
      />,
    );
    return onChange;
  };

  it('names each tab with its count and selects the one matching every key', () => {
    renderTabs({ view: 'ALL', status: 'DELIVERED' });

    expect(screen.getByRole('tab', { name: 'Exceptions, 3' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Delivered' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'All, 9' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('sets the chosen key and resets the others', async () => {
    const onChange = renderTabs({ view: 'ALL', status: 'DELIVERED' });

    await userEvent.click(screen.getByRole('tab', { name: 'Exceptions, 3' }));

    expect(onChange).toHaveBeenCalledWith({
      view: 'exceptions',
      status: 'ALL',
    });
  });

  it('selects no tab for a status without one', () => {
    renderTabs({ view: 'ALL', status: 'PENDING' });

    expect(screen.queryByRole('tab', { selected: true })).toBeNull();
  });
});
