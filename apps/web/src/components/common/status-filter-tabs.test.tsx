import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { APPROVAL_STATUS } from '@/lib/status-colors';
import { StatusFilterTabs, statusFilterOptions } from './status-filter-tabs';

describe('statusFilterOptions', () => {
  it('labels each status from its metadata and places All first', () => {
    expect(statusFilterOptions(APPROVAL_STATUS, ['PENDING'])).toEqual([
      { label: 'All', value: 'ALL', count: undefined },
      { label: 'Pending', value: 'PENDING', count: undefined },
    ]);
  });

  it('adds counts, with All summing them, and can place All last', () => {
    expect(
      statusFilterOptions(APPROVAL_STATUS, ['PENDING', 'REJECTED'], {
        counts: { PENDING: 2, REJECTED: 1 },
        allPosition: 'last',
      }),
    ).toEqual([
      { label: 'Pending', value: 'PENDING', count: 2 },
      { label: 'Rejected', value: 'REJECTED', count: 1 },
      { label: 'All', value: 'ALL', count: 3 },
    ]);
  });
});

describe('StatusFilterTabs', () => {
  it('reports the chosen status', async () => {
    const onChange = vi.fn();
    render(
      <StatusFilterTabs
        options={statusFilterOptions(APPROVAL_STATUS, ['PENDING', 'APPROVED'])}
        value="ALL"
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole('tab', { name: 'Approved' }));

    expect(onChange).toHaveBeenCalledWith('APPROVED');
  });
});
