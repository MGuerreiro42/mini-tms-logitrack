import { QueryClient } from '@tanstack/react-query';
import { eligibleCarriersKey, shipmentKeys } from '../api/keys';
import { invalidateShipmentQueries } from './invalidate-shipment-queries';

describe('invalidateShipmentQueries', () => {
  it('marks shipment data stale but leaves the eligible-carriers reference data alone', () => {
    const queryClient = new QueryClient();
    const detailKey = shipmentKeys.detail('shipment-1');
    const carriersKey = eligibleCarriersKey('SP', 'São Paulo', 'modality-1');
    queryClient.setQueryData(detailKey, {});
    queryClient.setQueryData(carriersKey, []);

    invalidateShipmentQueries(queryClient);

    expect(queryClient.getQueryState(detailKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(carriersKey)?.isInvalidated).toBe(false);
  });
});
