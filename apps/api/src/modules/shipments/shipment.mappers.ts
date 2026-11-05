import type {
  Prisma,
  Shipment,
  ShipmentStatus,
  TrackingEvent,
} from '../../../generated/prisma/client';
import type { AdminShipmentResponseDto } from './dto/admin-shipment-response.dto';
import type {
  CarrierShipmentDetailResponseDto,
  CarrierShipmentResponseDto,
} from './dto/carrier-shipment-response.dto';
import type { LiveMapDto, PublicLiveMapDto } from './dto/live-map.dto';
import type { ShipmentActivityResponseDto } from './dto/shipment-activity-response.dto';
import type { ShipmentAddressDto } from './dto/shipment-address.dto';
import type {
  ShipmentDetailResponseDto,
  ShipmentResponseDto,
} from './dto/shipment-response.dto';
import type { TrackingEventDto } from './dto/tracking-event.dto';
import { isPublicPosition, publicRoute } from './route-geometry';
import { type DemoRoute, routeSellerInclude } from './routes';
import { computeDueAt } from './shipment-due-at';
import type { VehiclePosition } from './vehicle-positions';

const timeline = {
  trackingEvents: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.ShipmentInclude;

const modality = {
  modality: { select: { name: true, slaHours: true } },
} satisfies Prisma.ShipmentInclude;

export const sellerShipmentInclude = {
  carrier: { select: { companyName: true } },
  ...modality,
} satisfies Prisma.ShipmentInclude;

export const sellerShipmentDetailInclude = {
  ...sellerShipmentInclude,
  ...timeline,
  ...routeSellerInclude,
} satisfies Prisma.ShipmentInclude;

export const carrierShipmentInclude = {
  ...modality,
  seller: { include: { user: { select: { email: true } } } },
  owner: { include: { user: { select: { email: true } } } },
} satisfies Prisma.ShipmentInclude;

export const carrierShipmentDetailInclude = {
  ...carrierShipmentInclude,
  ...timeline,
} satisfies Prisma.ShipmentInclude;

export const adminShipmentInclude = {
  ...carrierShipmentInclude,
  carrier: { select: { companyName: true } },
} satisfies Prisma.ShipmentInclude;

type ShipmentWith<I extends Prisma.ShipmentInclude> =
  Prisma.ShipmentGetPayload<{
    include: I;
  }>;

type AddressSource = Omit<ShipmentAddressDto, 'addressComplement'> & {
  addressComplement?: string | null;
};

export const pickAddress = (source: AddressSource): ShipmentAddressDto => ({
  addressStreet: source.addressStreet,
  addressNumber: source.addressNumber,
  addressComplement: source.addressComplement ?? null,
  addressNeighborhood: source.addressNeighborhood,
  addressCity: source.addressCity,
  addressState: source.addressState,
  addressZipCode: source.addressZipCode,
});

const toTrackingEventDto = (
  event: Pick<TrackingEvent, 'id' | 'status' | 'note' | 'createdAt'>,
): TrackingEventDto => ({
  id: event.id,
  status: event.status,
  note: event.note,
  createdAt: event.createdAt,
});

export const toShipmentActivityResponseDto = (
  event: Pick<TrackingEvent, 'id' | 'status' | 'createdAt'> & {
    shipment: Pick<Shipment, 'id' | 'trackingCode' | 'addressCity'>;
  },
): ShipmentActivityResponseDto => ({
  id: event.id,
  shipmentId: event.shipment.id,
  trackingCode: event.shipment.trackingCode,
  status: event.status,
  city: event.shipment.addressCity,
  createdAt: event.createdAt,
});

export const toShipmentResponseDto = (
  shipment: ShipmentWith<typeof sellerShipmentInclude>,
): ShipmentResponseDto => ({
  id: shipment.id,
  trackingCode: shipment.trackingCode,
  status: shipment.status,
  carrierId: shipment.carrierId,
  carrierName: shipment.carrier.companyName,
  modalityId: shipment.modalityId,
  modalityName: shipment.modality.name,
  ...pickAddress(shipment),
  createdAt: shipment.createdAt,
  dueAt: computeDueAt(shipment.createdAt, shipment.modality.slaHours),
});

export interface LiveMap {
  route: DemoRoute | null;
  lastPosition: VehiclePosition | null;
}

export const toLiveMapDto = ({ route, lastPosition }: LiveMap): LiveMapDto => ({
  map: route && {
    route: route.points,
    splitIndex: route.splitIndex,
    destination: route.destination,
  },
  lastPosition,
});

export const toPublicLiveMapDto = (
  { route, lastPosition }: LiveMap,
  status: ShipmentStatus,
): PublicLiveMapDto => ({
  map: route && {
    route: publicRoute(route),
    city: route.city,
    cityCenter: route.cityCenter,
  },
  lastPosition:
    lastPosition && isPublicPosition(route, status, lastPosition)
      ? lastPosition
      : null,
});

export const toShipmentDetailResponseDto = (
  shipment: ShipmentWith<typeof sellerShipmentDetailInclude>,
  liveMap: LiveMap,
): ShipmentDetailResponseDto => ({
  ...toShipmentResponseDto(shipment),
  trackingEvents: shipment.trackingEvents.map(toTrackingEventDto),
  ...toLiveMapDto(liveMap),
});

export const toCarrierShipmentResponseDto = (
  shipment: ShipmentWith<typeof carrierShipmentInclude>,
): CarrierShipmentResponseDto => ({
  id: shipment.id,
  trackingCode: shipment.trackingCode,
  status: shipment.status,
  modalityId: shipment.modalityId,
  modalityName: shipment.modality.name,
  sellerId: shipment.sellerId,
  sellerCompanyName: shipment.seller.companyName,
  sellerEmail: shipment.seller.user.email,
  ownerId: shipment.ownerId,
  ownerEmail: shipment.owner?.user.email ?? null,
  ...pickAddress(shipment),
  createdAt: shipment.createdAt,
  dueAt: computeDueAt(shipment.createdAt, shipment.modality.slaHours),
});

export const toCarrierShipmentDetailResponseDto = (
  shipment: ShipmentWith<typeof carrierShipmentDetailInclude>,
  liveMap: LiveMap,
): CarrierShipmentDetailResponseDto => ({
  ...toCarrierShipmentResponseDto(shipment),
  trackingEvents: shipment.trackingEvents.map(toTrackingEventDto),
  ...toLiveMapDto(liveMap),
});

export const toAdminShipmentResponseDto = (
  shipment: ShipmentWith<typeof adminShipmentInclude>,
): AdminShipmentResponseDto => ({
  ...toCarrierShipmentResponseDto(shipment),
  carrierCompanyName: shipment.carrier.companyName,
});
