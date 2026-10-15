export const ADMIN_MONITORING_ROOM = 'admin:monitoring';
export const TRACKING_ROOM_PREFIX = 'tracking:';

export const shipmentRoom = (shipmentId: string) => `shipment:${shipmentId}`;
export const sellerRoom = (sellerId: string) => `seller:${sellerId}`;
export const carrierRoom = (carrierId: string) => `carrier:${carrierId}`;
export const trackingRoom = (trackingCode: string) =>
  `${TRACKING_ROOM_PREFIX}${trackingCode}`;
