export const ROUTES = {
  home: '/',
  login: '/login',
  forbidden: '/forbidden',
  status: '/status',
  seller: '/seller',
  sellerShipments: '/seller/shipments',
  sellerShipment: (id: string) => `/seller/shipments/${id}`,
  newShipment: '/seller/shipments/new',
  sellerModalities: '/seller/modalities',
  sellerProfile: '/seller/profile',
} as const;
