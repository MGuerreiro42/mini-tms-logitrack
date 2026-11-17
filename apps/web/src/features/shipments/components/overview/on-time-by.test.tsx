import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { setSession } from '@/lib/session';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import { setViewportWidth } from '@/test/viewport';
import { OnTimeBy } from './on-time-by';
import { API_URL, sellerMetrics } from './overview.fixtures';

const rate = (count: number, n: number) => ({
  count,
  n,
  rate: (count / n) * 100,
});

describe('OnTimeBy', () => {
  beforeEach(() => {
    setSession({ token: 't', role: 'SELLER', userId: 'u', email: 'a@b.c' });
    server.use(
      http.get(`${API_URL}/shipments/metrics`, () =>
        HttpResponse.json(
          sellerMetrics({
            byState: [
              { uf: 'SP', ...rate(90, 96) },
              { uf: 'AC', ...rate(3, 3) },
              { uf: 'PR', ...rate(7, 9) },
            ],
            byModality: [
              {
                modalityCode: 'EXPRESS',
                modalityName: 'Express',
                ...rate(27, 30),
              },
              {
                modalityCode: 'STANDARD',
                modalityName: 'Standard',
                ...rate(74, 80),
              },
            ],
          }),
        ),
      ),
    );
  });

  it('reads each state worst first with its range, too few last, each a link to its list', async () => {
    renderWithQueryClient(<OnTimeBy statsWindow="90d" poll={() => false} />);

    expect(
      await screen.findByRole('radio', { name: 'Destination' }),
    ).toBeChecked();
    const links = within((await screen.findAllByRole('list'))[0]).getAllByRole(
      'link',
    );
    expect(links.map((link) => link.getAttribute('aria-label'))).toEqual([
      'PR: 78% on time, 7 of 9, likely 45–94%',
      'SP: 94% on time, 90 of 96, likely 87–97%',
      'AC: too few deliveries, n=3',
    ]);
    expect(links[0]).toHaveAttribute(
      'href',
      '/seller/shipments?status=DELIVERED&window=90d&uf=PR',
    );
    expect(links[2]).toHaveTextContent('too few · n=3');
  });

  it('opens on Modality on a narrow screen, linking each modality', async () => {
    setViewportWidth(390);
    renderWithQueryClient(<OnTimeBy statsWindow="30d" poll={() => false} />);

    expect(
      await screen.findByRole('link', { name: /^Express: 90% on time/ }),
    ).toHaveAttribute(
      'href',
      '/seller/shipments?status=DELIVERED&window=30d&modality=EXPRESS',
    );
    expect(screen.getByRole('radio', { name: 'Modality' })).toBeChecked();

    await userEvent
      .setup()
      .click(screen.getByRole('radio', { name: 'Destination' }));
    expect(
      screen.getByRole('link', { name: /^PR: 78% on time/ }),
    ).toBeVisible();
  });
});
