import { QueryClient } from '@tanstack/react-query';
import { act } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { setSession } from '@/lib/session';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import {
  API_URL,
  attention,
  sellerMetrics,
  shipment,
} from './overview.fixtures';
import { OverviewAnnouncer } from './overview-announcer';

const lateOnes = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    shipment(`late-${i}`, 'IN_TRANSIT', -2),
  );

function mount(initial: { metricsAfterAttention?: boolean } = {}) {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  setSession({ token: 't', role: 'SELLER', userId: 'u', email: 'a@b.c' });
  const served = {
    late: 5,
    metrics: sellerMetrics(),
    metricsReady: !initial.metricsAfterAttention,
  };
  server.use(
    http.get(`${API_URL}/shipments/attention`, () =>
      HttpResponse.json(attention(lateOnes(served.late), [])),
    ),
    http.get(`${API_URL}/shipments/metrics`, async () => {
      await vi.waitFor(() => expect(served.metricsReady).toBe(true));
      return HttpResponse.json(served.metrics);
    }),
  );
  const queryClient = new QueryClient();
  const { container } = renderWithQueryClient(
    <OverviewAnnouncer
      statsWindow="90d"
      poll={() => false}
      webhook={undefined}
    />,
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

  it('batches exception and health changes into one sentence per 10 s, silent on first load', async () => {
    const page = mount();
    await page.loaded(['shipments', 'attention']);
    await page.loaded(['shipments', 'metrics', '90d']);
    await page.settle();
    expect(page.region).toBeEmptyDOMElement();

    // After a quiet 10 s the first change is spoken at once...
    page.served.late = 6;
    await page.refetch();
    await vi.waitFor(() =>
      expect(page.region).toHaveTextContent('Exceptions 5 → 6.'),
    );

    // ...and the next ones inside the window wait, then speak as one sentence.
    page.served.late = 7;
    await page.refetch();
    page.served.late = 8;
    page.served.metrics = sellerMetrics({
      firstAttempt: { rate: 88, n: 159, failed: 13, returned: 6 },
    });
    await page.refetch();
    await page.settle();
    expect(page.region).toHaveTextContent(
      'Exceptions 6 → 8. Delivery health now Fair, held back by first attempt 88.0% (n=159).',
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

  it('stays silent when the metrics arrive after the attention', async () => {
    const page = mount({ metricsAfterAttention: true });
    await page.loaded(['shipments', 'attention']);
    await page.settle();

    page.served.metricsReady = true;
    await page.loaded(['shipments', 'metrics', '90d']);
    await page.settle();

    expect(page.region).toBeEmptyDOMElement();
  });
});
