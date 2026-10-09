import { screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { setSession } from '@/lib/session';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import type { CarrierPerformance as CarrierPerformanceData } from '../types';
import { CarrierPerformance } from './carrier-performance';

const API_URL = 'http://localhost:3333';

const performance: CarrierPerformanceData = {
  shipmentCountsByStatus: {
    PENDING: 0,
    ACCEPTED: 0,
    COLLECTED: 0,
    IN_TRANSIT: 0,
    OUT_FOR_DELIVERY: 0,
    DELIVERED: 1,
    FAILED_DELIVERY: 0,
    CANCELLED: 0,
    RETURNED: 0,
  },
  totalShipments: 1,
  avgHoursBetweenEvents: 0.05,
  failedDeliveryRate: 0,
  returnedRate: 0,
  stageDurations: [],
};

describe('CarrierPerformance', () => {
  it('shows short averages in minutes instead of 0.0h', async () => {
    setSession({
      token: 't',
      role: 'CARRIER_MANAGER',
      userId: 'user-1',
      email: 'manager@example.com',
    });
    server.use(
      http.get(`${API_URL}/carriers/me/performance`, () =>
        HttpResponse.json(performance),
      ),
      http.get(`${API_URL}/carriers/me/operator-ranking`, () =>
        HttpResponse.json([]),
      ),
    );

    renderWithQueryClient(<CarrierPerformance />);

    expect(await screen.findByText('3 min')).toBeInTheDocument();
    expect(screen.queryByText('0.0h')).toBeNull();
  });
});
