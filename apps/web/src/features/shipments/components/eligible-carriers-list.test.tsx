import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { setSession } from '@/lib/session';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import { EligibleCarriersList } from './eligible-carriers-list';

const API_URL = 'http://localhost:3333';

describe('EligibleCarriersList', () => {
  beforeEach(() => {
    setSession({
      token: 'signed.jwt.token',
      role: 'SELLER',
      userId: 'user-1',
      email: 'seller@example.com',
    });
  });

  it('shows the empty state — the most important exception in this flow — when no carrier matches', async () => {
    server.use(
      http.get(`${API_URL}/shipments/eligible-carriers`, () =>
        HttpResponse.json([]),
      ),
    );
    renderWithQueryClient(
      <EligibleCarriersList
        state="SP"
        city="Araraquara"
        modalityId="modality-1"
        onBack={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(
      await screen.findByText('No compatible carrier'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Araraquara\/SP/)).toBeInTheDocument();
  });

  it('lists matching carriers and calls onNext when one is chosen', async () => {
    server.use(
      http.get(`${API_URL}/shipments/eligible-carriers`, () =>
        HttpResponse.json([
          { id: 'carrier-1', companyName: 'Fast Freight' },
          { id: 'carrier-2', companyName: 'Speedy Logistics' },
        ]),
      ),
    );
    const user = userEvent.setup();
    const onNext = vi.fn();
    renderWithQueryClient(
      <EligibleCarriersList
        state="SP"
        city="São Paulo"
        modalityId="modality-1"
        onBack={vi.fn()}
        onNext={onNext}
      />,
    );

    expect(await screen.findByText('2 matches')).toBeInTheDocument();
    await user.click(screen.getByText('Fast Freight'));

    expect(onNext).toHaveBeenCalledWith('carrier-1', 'Fast Freight');
  });

  it('calls onBack when the back button is clicked', async () => {
    server.use(
      http.get(`${API_URL}/shipments/eligible-carriers`, () =>
        HttpResponse.json([]),
      ),
    );
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithQueryClient(
      <EligibleCarriersList
        state="SP"
        city="São Paulo"
        modalityId="modality-1"
        onBack={onBack}
        onNext={vi.fn()}
      />,
    );

    await screen.findByText('No compatible carrier');
    await user.click(screen.getByRole('button', { name: /back/i }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
