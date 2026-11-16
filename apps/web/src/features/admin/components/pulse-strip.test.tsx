import { screen, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { setSession } from '@/lib/session';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import type { Pulse } from '../hooks/use-pulse';
import { PulseStrip } from './pulse-strip';

const API_URL = 'http://localhost:3333';

const PULSE: Pulse = {
  eventsPerMinute: [...Array(14).fill(2), 7],
  sockets: { internal: 4, public: 1 },
  simulator: 'running',
  webhooks: { n: 20, successRate: 95, p95Ms: 340 },
  queues: [
    { name: 'webhooks', waiting: 1, failed: 2 },
    { name: 'demo', waiting: 3, failed: 0 },
  ],
  services: { database: true, redis: true },
  chaos: null,
};

const answer = (pulse: Partial<Pulse>) =>
  server.use(
    http.get(`${API_URL}/admin/pulse`, () =>
      HttpResponse.json({ ...PULSE, ...pulse }),
    ),
  );

function item(label: string) {
  const term = screen.getByText(label, { selector: 'dt' });
  return within(term.parentElement as HTMLElement).getByRole('definition');
}

describe('PulseStrip', () => {
  beforeEach(() => {
    setSession({ token: 't', role: 'ADMIN', userId: 'u', email: 'e' });
  });

  it('reads every part of the pulse', async () => {
    answer({});
    renderWithQueryClient(<PulseStrip />);
    await screen.findByText('Postgres up');

    expect(item('Events')).toHaveTextContent('7/min');
    expect(item('Sockets')).toHaveTextContent('5 · 1 public');
    expect(item('Simulator')).toHaveTextContent('Running');
    expect(item('Webhooks · 1 h')).toHaveTextContent('95.0% · p95 340 ms');
    expect(item('Queues')).toHaveTextContent('4 waiting · 2 failed');
    expect(item('Data')).toHaveTextContent('Postgres up');
  });

  it('degrades each part on its own, in words', async () => {
    answer({
      eventsPerMinute: null,
      sockets: null,
      simulator: 'off',
      webhooks: { n: 0, successRate: null, p95Ms: null },
      queues: [],
      services: { database: true, redis: false },
    });
    renderWithQueryClient(<PulseStrip />);
    await screen.findByText('Postgres up');

    expect(item('Data')).toHaveTextContent('Redis down');
    expect(item('Events')).toHaveTextContent('Unavailable');
    expect(item('Sockets')).toHaveTextContent('Unavailable');
    expect(item('Queues')).toHaveTextContent('Unavailable');
    expect(item('Simulator')).toHaveTextContent('Off');
    expect(item('Webhooks · 1 h')).toHaveTextContent('No deliveries');
  });

  it('names the running chaos scenario in place of the simulator state', async () => {
    answer({
      chaos: {
        scenario: 'carrier-outage',
        label: 'Transportadora Demo outage',
        endsAt: '2026-01-01T12:03:00.000Z',
      },
    });
    renderWithQueryClient(<PulseStrip />);
    await screen.findByText('Postgres up');

    expect(item('Simulator')).toHaveTextContent(
      'Chaos · Transportadora Demo outage',
    );
  });

  it('says so in place when the pulse request fails', async () => {
    server.use(
      http.get(`${API_URL}/admin/pulse`, () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    );
    renderWithQueryClient(<PulseStrip />);

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Pulse unavailable · retrying',
    );
  });
});
