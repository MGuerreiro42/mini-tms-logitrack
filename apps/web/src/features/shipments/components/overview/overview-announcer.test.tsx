import { QueryClient } from '@tanstack/react-query';
import { act } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { setSession } from '@/lib/session';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import { API_URL, attention, shipment } from './overview.fixtures';
import { OverviewAnnouncer } from './overview-announcer';

const lateOnes = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    shipment(`late-${i}`, 'IN_TRANSIT', -2),
  );

describe('OverviewAnnouncer', () => {
  afterEach(() => vi.useRealTimers());

  it('batches exception changes into one sentence per 10 s, silent on first load', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setSession({ token: 't', role: 'SELLER', userId: 'u', email: 'a@b.c' });
    let late = 5;
    server.use(
      http.get(`${API_URL}/shipments/attention`, () =>
        HttpResponse.json(attention(lateOnes(late), [])),
      ),
    );
    const queryClient = new QueryClient();
    const { container } = renderWithQueryClient(
      <OverviewAnnouncer poll={() => false} webhook={undefined} />,
      queryClient,
    );
    const region = container.querySelector('[aria-live="polite"]');
    const refetch = async (count: number) => {
      late = count;
      await act(() => queryClient.refetchQueries());
    };
    await vi.waitFor(() =>
      expect(
        queryClient.getQueryData(['shipments', 'attention']),
      ).toBeDefined(),
    );
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(region).toHaveTextContent('');

    await refetch(6);
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(region).toHaveTextContent('Exceptions 5 → 6.');

    await refetch(7);
    await refetch(8);
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(region).toHaveTextContent('Exceptions 6 → 8.');
  });
});
