import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type Column, PaginatedTable } from './paginated-table';

interface Row {
  id: string;
  name: string;
}

const columns: Column<Row>[] = [{ header: 'Name', cell: (row) => row.name }];

describe('PaginatedTable', () => {
  it('shows the empty message when there is no data', () => {
    render(
      <PaginatedTable<Row>
        columns={columns}
        data={[]}
        meta={{ total: 0, page: 1, limit: 20, totalPages: 0 }}
        onPageChange={vi.fn()}
        getRowKey={(row) => row.id}
        emptyMessage="No rows yet."
      />,
    );

    expect(screen.getByText('No rows yet.')).toBeInTheDocument();
  });

  it('hides the pager entirely when there is only one page', () => {
    render(
      <PaginatedTable<Row>
        columns={columns}
        data={[{ id: 'row-1', name: 'Row 1' }]}
        meta={{ total: 1, page: 1, limit: 20, totalPages: 1 }}
        onPageChange={vi.fn()}
        getRowKey={(row) => row.id}
      />,
    );

    expect(screen.queryByRole('button', { name: /previous/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /next/i })).toBeNull();
  });

  it('disables Previous on the first page and Next on the last page', () => {
    render(
      <PaginatedTable<Row>
        columns={columns}
        data={[{ id: 'row-1', name: 'Row 1' }]}
        meta={{ total: 60, page: 1, limit: 20, totalPages: 3 }}
        onPageChange={vi.fn()}
        getRowKey={(row) => row.id}
      />,
    );

    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
  });

  it('calls onPageChange with the next/previous page number', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <PaginatedTable<Row>
        columns={columns}
        data={[{ id: 'row-1', name: 'Row 1' }]}
        meta={{ total: 60, page: 2, totalPages: 3, limit: 20 }}
        onPageChange={onPageChange}
        getRowKey={(row) => row.id}
      />,
    );

    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(3);

    await user.click(screen.getByRole('button', { name: /previous/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('renders each row as a real link to getRowHref', () => {
    render(
      <PaginatedTable<Row>
        columns={columns}
        data={[{ id: 'row-1', name: 'Row 1' }]}
        meta={{ total: 1, page: 1, limit: 20, totalPages: 1 }}
        onPageChange={vi.fn()}
        getRowKey={(row) => row.id}
        getRowHref={(row) => `/admin/sellers/${row.id}`}
      />,
    );

    expect(screen.getByRole('link', { name: 'Row 1' })).toHaveAttribute(
      'href',
      '/admin/sellers/row-1',
    );
  });

  it('renders no link when getRowHref is not provided', () => {
    render(
      <PaginatedTable<Row>
        columns={columns}
        data={[{ id: 'row-1', name: 'Row 1' }]}
        meta={{ total: 1, page: 1, limit: 20, totalPages: 1 }}
        onPageChange={vi.fn()}
        getRowKey={(row) => row.id}
      />,
    );

    expect(screen.queryByRole('link')).toBeNull();
  });
});
