import { act, render, screen } from '@testing-library/react';
import type { WebhookHealth } from '@/features/integrations/types';
import { WebhookStrip } from './webhook-strip';

const health: WebhookHealth = {
  state: 'degraded',
  n: 23,
  successRate: 91.3,
  p95Ms: 1200,
  lastSuccessAt: new Date(Date.now() - 4 * 60_000).toISOString(),
  failingSince: null,
};

describe('WebhookStrip', () => {
  it('reads a degraded endpoint as a polite status', () => {
    render(<WebhookStrip health={health} />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Webhooks degraded 91% of 23 attempts succeeded · p95 1.2 s · last success 4 min ago',
    );
  });

  it('says no success in 24 h when a down endpoint never succeeded in the window', () => {
    render(
      <WebhookStrip
        health={{ ...health, state: 'down', lastSuccessAt: null }}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('no success in 24 h');
  });

  it('keeps the last success current without a refetch', () => {
    vi.useFakeTimers();
    try {
      render(<WebhookStrip health={health} />);
      expect(screen.getByRole('status')).toHaveTextContent(
        'last success 4 min ago',
      );

      act(() => {
        vi.advanceTimersByTime(5 * 60_000);
      });

      expect(screen.getByRole('status')).toHaveTextContent(
        'last success 9 min ago',
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows nothing when the endpoint is fine, absent or too quiet to judge', () => {
    const { container } = render(
      <WebhookStrip health={{ ...health, state: 'too_few' }} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
