import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { setSession } from '@/lib/session';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import type { AdminDemo } from '../types';
import { ChaosControls } from './chaos-controls';

const API_URL = 'http://localhost:3333';
const SCENARIOS = [
  {
    id: 'failed-deliveries',
    label: 'Storm: failed deliveries',
    description: 'About half of the deliveries fail, then return to sender.',
  },
  {
    id: 'carrier-outage',
    label: 'Transportadora Demo outage',
    description: 'The carrier stops claiming and moving shipments.',
  },
];
const IDLE: AdminDemo = {
  lastResetAt: null,
  nextResetAt: null,
  chaos: null,
  cooldownUntil: null,
  scenarios: SCENARIOS,
  runs: [],
};
const at = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

describe('ChaosControls', () => {
  let started: unknown[];
  let ended: number;

  beforeEach(() => {
    started = [];
    ended = 0;
    setSession({ token: 't', role: 'ADMIN', userId: 'u', email: 'e' });
    server.use(
      http.post(`${API_URL}/admin/demo/chaos`, async ({ request }) => {
        started.push(await request.json());
        return HttpResponse.json({ ...SCENARIOS[0], endsAt: at(60_000) });
      }),
      http.delete(`${API_URL}/admin/demo/chaos`, () => {
        ended++;
        return new HttpResponse(null, { status: 204 });
      }),
      http.get(`${API_URL}/admin/demo`, () => HttpResponse.json(IDLE)),
    );
  });

  const startButtons = () => screen.getAllByRole('button', { name: /^Start / });

  it('starts a scenario for the chosen duration, 3 minutes by default', async () => {
    renderWithQueryClient(<ChaosControls now={Date.now()} demo={IDLE} />);
    expect(screen.getByRole('radio', { name: '3 min' })).toBeChecked();

    await userEvent.click(screen.getByRole('radio', { name: '1 min' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Start Storm: failed deliveries' }),
    );

    expect(started).toEqual([
      { scenario: 'failed-deliveries', durationSec: 60 },
    ]);
    expect(screen.getByText('No scenario has run yet.')).toBeInTheDocument();
  });

  it('shows the running scenario and allows one at a time', async () => {
    const chaos = {
      scenario: SCENARIOS[1].id,
      label: SCENARIOS[1].label,
      description: SCENARIOS[1].description,
      startedAt: at(-60_000),
      endsAt: at(120_000),
      startedBy: 'admin@minitms.dev',
    };
    renderWithQueryClient(
      <ChaosControls now={Date.now()} demo={{ ...IDLE, chaos }} />,
    );

    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).toBeNull();
    for (const button of startButtons()) {
      expect(button).toBeDisabled();
      expect(button).toHaveAccessibleDescription('One scenario at a time');
    }

    await userEvent.click(screen.getByRole('button', { name: 'End now' }));

    expect(ended).toBe(1);
  });

  it('says Ending… and keeps Start off for a run past its end the server still holds', () => {
    const chaos = {
      scenario: SCENARIOS[0].id,
      label: SCENARIOS[0].label,
      description: SCENARIOS[0].description,
      startedAt: at(-61_000),
      endsAt: at(-1_000),
      startedBy: 'admin@minitms.dev',
    };
    renderWithQueryClient(
      <ChaosControls now={Date.now()} demo={{ ...IDLE, chaos }} />,
    );

    expect(screen.getAllByText('Ending…')).toHaveLength(2);
    for (const button of startButtons()) {
      expect(button).toBeDisabled();
      expect(button).toHaveAccessibleDescription('Ending…');
    }
  });

  it('counts the cooldown down on every Start', () => {
    renderWithQueryClient(
      <ChaosControls
        now={Date.now()}
        demo={{ ...IDLE, cooldownUntil: at(45_000) }}
      />,
    );

    for (const button of startButtons()) {
      expect(button).toBeDisabled();
      expect(button).toHaveAccessibleDescription(/^Available in 0:4\d$/);
    }
  });

  it('lists the last runs with how each ended', () => {
    const run = (reason: 'expired' | 'admin' | 'reset') => ({
      scenario: 'failed-deliveries',
      startedAt: `2026-01-02T1${['expired', 'admin', 'reset'].indexOf(reason)}:00:00.000Z`,
      endedAt: '2026-01-02T13:03:00.000Z',
      reason,
    });
    renderWithQueryClient(
      <ChaosControls
        now={Date.now()}
        demo={{ ...IDLE, runs: [run('expired'), run('admin'), run('reset')] }}
      />,
    );

    const items = within(screen.getByRole('list', { name: 'Last runs' }))
      .getAllByRole('listitem')
      .map((item) => item.textContent);
    expect(items).toEqual([
      'Storm: failed deliveries · 07:00–10:03 · Expired',
      'Storm: failed deliveries · 08:00–10:03 · Ended by an admin',
      'Storm: failed deliveries · 09:00–10:03 · Ended by the reset',
    ]);
  });
});
