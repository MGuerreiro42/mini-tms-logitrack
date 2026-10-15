import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterMenu, FilterToolbar } from './filter-toolbar';

const options = [
  { value: 'ALL', label: 'All', count: 12 },
  { value: 'PENDING', label: 'Pending', count: 3 },
];

describe('FilterMenu', () => {
  it('shows the label, the chosen value and its count', () => {
    render(
      <FilterMenu
        label="Status"
        value="ALL"
        options={options}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Status: All 12' }),
    ).toBeInTheDocument();
  });

  it('reports the picked option', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FilterMenu
        label="Status"
        value="ALL"
        options={options}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: /status/i }));
    await user.click(screen.getByRole('menuitemradio', { name: /pending/i }));

    expect(onChange).toHaveBeenCalledWith('PENDING');
  });
});

describe('FilterToolbar', () => {
  it('offers Clear filters only when given a handler', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    const { rerender } = render(<FilterToolbar summary="12 shipments" />);

    expect(screen.getByText('12 shipments')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();

    rerender(<FilterToolbar onClear={onClear} />);
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(onClear).toHaveBeenCalled();
  });

  it('switches and persists the table density', async () => {
    const user = userEvent.setup();
    render(<FilterToolbar />);
    const compact = screen.getByRole('radio', { name: 'Compact' });
    expect(screen.getByRole('radio', { name: 'Comfortable' })).toBeChecked();

    await user.click(compact);

    expect(compact).toBeChecked();
    expect(
      screen.getByRole('radio', { name: 'Comfortable' }),
    ).not.toBeChecked();
    expect(localStorage.getItem('tms:density')).toBe('compact');
  });
});
