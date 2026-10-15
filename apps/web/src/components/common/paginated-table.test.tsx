import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setDensity } from '@/hooks/use-density';
import { setViewportWidth } from '@/test/viewport';
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

  it.each([
    [3, 3],
    [0, 1],
  ])('steps back from a page past the end (%i pages) to page %i', (totalPages, expected) => {
    const onPageChange = vi.fn();
    render(
      <PaginatedTable<Row>
        columns={columns}
        data={[]}
        meta={{ total: totalPages * 20, page: 99, limit: 20, totalPages }}
        onPageChange={onPageChange}
        getRowKey={(row) => row.id}
        emptyMessage="No rows yet."
      />,
    );

    expect(onPageChange).toHaveBeenCalledWith(expected);
    expect(screen.queryByText('No rows yet.')).toBeNull();
    expect(screen.queryByText(/Page 99/)).toBeNull();
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

  it('keys header-less columns by id without a duplicate-key warning', () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    render(
      <PaginatedTable<Row>
        columns={[
          ...columns,
          { id: 'edit', header: '', cell: () => 'Edit' },
          { id: 'remove', header: '', cell: () => 'Remove' },
        ]}
        data={[{ id: 'row-1', name: 'Row 1' }]}
        getRowKey={(row) => row.id}
      />,
    );

    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Remove')).toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
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

  it('works as a plain table without pagination props', () => {
    render(
      <PaginatedTable<Row>
        columns={columns}
        data={[{ id: 'row-1', name: 'Row 1' }]}
        getRowKey={(row) => row.id}
      />,
    );

    expect(screen.getByText('Row 1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next/i })).toBeNull();
  });

  it('applies the persisted density to the table', () => {
    setDensity('compact');
    const { container } = render(
      <PaginatedTable<Row>
        columns={columns}
        data={[{ id: 'row-1', name: 'Row 1' }]}
        getRowKey={(row) => row.id}
      />,
    );

    expect(container.querySelector('[data-density]')).toHaveAttribute(
      'data-density',
      'compact',
    );
  });

  describe('below md', () => {
    const cardColumns: Column<Row>[] = [
      { header: 'Name', cell: (row) => row.name, card: 'title' },
      { header: 'State', cell: () => 'Open', card: 'badge' },
      { header: 'City', cell: () => 'Campinas', card: 'place' },
      { header: 'Due', cell: () => 'Due in 2 h', card: 'meta' },
      { header: 'Created', cell: () => 'Oct 1', card: 'meta' },
      { header: 'Notes', cell: () => 'Hidden on cards' },
    ];

    beforeEach(() => setViewportWidth(390));

    it('renders rows as linked cards, with unslotted columns as labeled lines', () => {
      render(
        <PaginatedTable<Row>
          columns={cardColumns}
          data={[{ id: 'row-1', name: 'Row 1' }]}
          getRowKey={(row) => row.id}
          getRowHref={(row) => `/seller/shipments/${row.id}`}
        />,
      );

      expect(screen.queryByRole('table')).toBeNull();
      const card = screen.getByRole('listitem');
      expect(card).toHaveTextContent('Row 1');
      expect(card).toHaveTextContent('Open');
      expect(card).toHaveTextContent('Campinas');
      expect(card).toHaveTextContent('Due in 2 h · Oct 1');
      expect(card).toHaveTextContent('Notes: Hidden on cards');
      expect(screen.getByRole('link', { name: 'Row 1' })).toHaveAttribute(
        'href',
        '/seller/shipments/row-1',
      );
    });

    it('switches between table and cards as the viewport changes', () => {
      act(() => setViewportWidth(1280));
      render(
        <PaginatedTable<Row>
          columns={cardColumns}
          data={[{ id: 'row-1', name: 'Row 1' }]}
          getRowKey={(row) => row.id}
        />,
      );
      expect(screen.getByRole('table')).toBeInTheDocument();

      act(() => setViewportWidth(390));

      expect(screen.queryByRole('table')).toBeNull();
      expect(screen.getByRole('listitem')).toHaveTextContent('Row 1');
    });

    it('keeps the table when no column has a card slot', () => {
      render(
        <PaginatedTable<Row>
          columns={columns}
          data={[{ id: 'row-1', name: 'Row 1' }]}
          getRowKey={(row) => row.id}
        />,
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });
});
