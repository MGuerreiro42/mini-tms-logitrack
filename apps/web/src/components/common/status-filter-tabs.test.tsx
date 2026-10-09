import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { APPROVAL_STATUS } from '@/lib/status-colors';
import { StatusFilterTabs, statusFilterOptions } from './status-filter-tabs';

describe('statusFilterOptions', () => {
  it('labels each status from its metadata and places All first by default', () => {
    expect(statusFilterOptions(APPROVAL_STATUS, ['PENDING'])).toEqual([
      { label: 'All', value: 'ALL' },
      { label: 'Pending', value: 'PENDING' },
    ]);
  });

  it('can place All last', () => {
    expect(
      statusFilterOptions(APPROVAL_STATUS, ['APPROVED'], 'last').at(-1),
    ).toEqual({ label: 'All', value: 'ALL' });
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
