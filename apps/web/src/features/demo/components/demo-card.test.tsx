import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { setSession } from '@/lib/session';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import type { AdminDemo } from '../types';
import { DemoCard } from './demo-card';

const API_URL = 'http://localhost:3333';
const DEMO: AdminDemo = {
  lastResetAt: '2026-01-02T07:00:00.000Z',
  nextResetAt: '2026-01-03T07:00:00.000Z',
  chaos: null,
  cooldownUntil: null,
  scenarios: [],
  runs: [],
};

describe('DemoCard', () => {
  let resetStatus: number;
  let resets: number;

  beforeEach(() => {
    resets = 0;
    resetStatus = 204;
    setSession({ token: 't', role: 'ADMIN', userId: 'u', email: 'e' });
    server.use(
      http.get(`${API_URL}/admin/demo`, () => HttpResponse.json(DEMO)),
      http.post(`${API_URL}/admin/demo/reset`, () => {
        resets++;
        return new HttpResponse(null, { status: resetStatus });
      }),
    );
  });

  const openReset = async () => {
    renderWithQueryClient(<DemoCard simulator="Running" />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Reset demo data…' }),
    );
  };

  it('reads the simulator and the reset schedule in São Paulo time', async () => {
    renderWithQueryClient(<DemoCard simulator="Running" />);

    expect(await screen.findByText('Running')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Resets daily at 04:00 · last reset 04:00 · next Sat 04:00',
      ),
    ).toBeInTheDocument();
  });

  it('resets the demo once confirmed', async () => {
    await openReset();

    await userEvent.click(
      screen.getByRole('button', { name: 'Reset demo data' }),
    );

    expect(resets).toBe(1);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('explains a reset refused for coming too soon', async () => {
    resetStatus = 429;
    await openReset();

    await userEvent.click(
      screen.getByRole('button', { name: 'Reset demo data' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The demo was reset a moment ago. Try again in a minute.',
    );
  });

  it('is absent where the API runs no simulator', async () => {
    server.use(
      http.get(
        `${API_URL}/admin/demo`,
        () => new HttpResponse(null, { status: 404 }),
      ),
    );
    const { container } = renderWithQueryClient(<DemoCard simulator="Off" />);

    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(container).toBeEmptyDOMElement();
  });
});
