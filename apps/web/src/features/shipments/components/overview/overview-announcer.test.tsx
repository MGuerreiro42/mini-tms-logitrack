import { QueryClient } from '@tanstack/react-query';
import { act } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { setSession } from '@/lib/session';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import { API_URL, sellerMetrics } from './overview.fixtures';
import { OverviewAnnouncer } from './overview-announcer';

function mount() {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  setSession({ token: 't', role: 'SELLER', userId: 'u', email: 'a@b.c' });
  const served = { metrics: sellerMetrics() };
  server.use(
    http.get(`${API_URL}/shipments/metrics`, () =>
      HttpResponse.json(served.metrics),
    ),
  );
  const queryClient = new QueryClient();
  const { container } = renderWithQueryClient(
    <OverviewAnnouncer statsWindow="90d" poll={() => false} />,
    queryClient,
  );
  return {
    served,
    queryClient,
    region: container.querySelector('[aria-live="polite"]'),
    refetch: () => act(() => queryClient.refetchQueries()),
    settle: () => act(() => vi.advanceTimersByTimeAsync(11_000)),
    loaded: (key: unknown[]) =>
      vi.waitFor(() => expect(queryClient.getQueryData(key)).toBeDefined()),
  };
}

describe('OverviewAnnouncer', () => {
  afterEach(() => vi.useRealTimers());

  it('speaks a Delivery health band change once, silent on first load', async () => {
    const page = mount();
    await page.loaded(['shipments', 'metrics', '90d']);
    await page.settle();
    expect(page.region).toBeEmptyDOMElement();

    page.served.metrics = sellerMetrics({
      firstAttempt: { rate: 88, n: 159, failed: 13, returned: 6 },
    });
    await page.refetch();
    await page.settle();
    expect(page.region).toHaveTextContent(
      'Delivery health now Fair, held back by first attempt 88.0% (n=159).',
    );
  });

  it('stays silent when only what holds the band back changes inside it', async () => {
    const page = mount();
    await page.loaded(['shipments', 'metrics', '90d']);
    await page.settle();

    page.served.metrics = sellerMetrics({
      onTime: { n: 150, count: 136, rate: 90.7, trend: [] },
    });
    await page.refetch();
    await page.settle();

    expect(page.region).toBeEmptyDOMElement();
  });
});
