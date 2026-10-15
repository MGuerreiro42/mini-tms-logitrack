import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/services/api-client';
import type { QuerySource } from '@/types/query';
import { QueryState } from './query-state';

function renderState(query: Partial<QuerySource<string>>) {
  const source = { data: undefined, error: null, refetch: vi.fn(), ...query };
  render(
    <QueryState query={source} notFoundMessage="Shipment not found.">
      {(data) => <p>{data}</p>}
    </QueryState>,
  );
  return source;
}

describe('QueryState', () => {
  it('shows a loading skeleton while there is no data and no error', () => {
    renderState({});
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  });

  it('renders children with the data', () => {
    renderState({ data: 'loaded' });
    expect(screen.getByText('loaded')).toBeInTheDocument();
  });

  it('keeps rendering stale data when a refetch fails', () => {
    renderState({ data: 'stale', error: new Error('boom') });
    expect(screen.getByText('stale')).toBeInTheDocument();
  });

  it('shows the not-found message on a 404', () => {
    renderState({ error: new ApiError(404, 'Not Found') });
    expect(screen.getByText('Shipment not found.')).toBeInTheDocument();
  });

  it('shows an access message on a 403', () => {
    renderState({ error: new ApiError(403, 'Carrier is not approved') });
    expect(
      screen.getByText("You don't have access to this."),
    ).toBeInTheDocument();
  });

  it('shows an error with a working retry button', async () => {
    const source = renderState({ error: new ApiError(500, 'Server error') });

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load");
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(source.refetch).toHaveBeenCalled();
  });
});
