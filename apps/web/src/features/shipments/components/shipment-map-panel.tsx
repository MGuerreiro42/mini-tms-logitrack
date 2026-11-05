'use client';

import type { QueryKey } from '@tanstack/react-query';
import { Panel } from '@/components/common/panel';
import { LazyDeliveryMap } from '@/features/tracking/components/lazy-delivery-map';
import { usePositionSubscription } from '@/features/tracking/hooks/use-position-subscription';
import { mapCaption, mapStage } from '@/features/tracking/lib/map-stage';
import { useSession } from '@/hooks/use-session';
import { getSocket } from '@/services/websocket-client';
import type {
  QueueShipmentDetail,
  ShipmentDetail,
  ShipmentPositionEvent,
} from '../types';

export function ShipmentMapPanel({
  shipment,
  queryKey,
}: {
  shipment: ShipmentDetail | QueueShipmentDetail;
  queryKey: QueryKey;
}) {
  const { id, status, map, lastPosition, addressCity } = shipment;
  usePositionSubscription<ShipmentPositionEvent>({
    getSocket,
    connectionKey: useSession()?.token,
    room: { event: 'subscribe:shipment', args: [id] },
    accepts: (event) => event.shipmentId === id,
    queryKey,
  });

  const stage = mapStage(status);
  const onRoad = stage === 'IN_TRANSIT' || stage === 'OUT_FOR_DELIVERY';
  // Without a stored route (address outside the demo), reported positions still get a marker.
  if (!stage || (!map && !(onRoad && lastPosition))) return null;

  return (
    <Panel title="Live map">
      <LazyDeliveryMap
        route={map?.route ?? null}
        splitIndex={map?.splitIndex}
        destination={map?.destination}
        stage={stage}
        position={onRoad ? lastPosition : null}
        label="Delivery route and vehicle position"
        caption={mapCaption(stage, addressCity)}
      />
    </Panel>
  );
}
