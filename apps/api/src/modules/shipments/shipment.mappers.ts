import type { Prisma, TrackingEvent } from '../../../generated/prisma/client';
import type { AdminShipmentResponseDto } from './dto/admin-shipment-response.dto';
import type {
  CarrierShipmentDetailResponseDto,
  CarrierShipmentResponseDto,
} from './dto/carrier-shipment-response.dto';
import type { ShipmentAddressDto } from './dto/shipment-address.dto';
import type { ShipmentResponseDto } from './dto/shipment-response.dto';
import type { TrackingEventDto } from './dto/tracking-event.dto';

const timeline = {
  trackingEvents: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.ShipmentInclude;

export const sellerShipmentInclude = {
  carrier: { select: { companyName: true } },
  modality: { select: { name: true } },
} satisfies Prisma.ShipmentInclude;

export const sellerShipmentDetailInclude = {
  ...sellerShipmentInclude,
  ...timeline,
} satisfies Prisma.ShipmentInclude;

// Carrier-facing reads also need the seller's contact and the claiming CarrierUser.
export const carrierShipmentInclude = {
  modality: { select: { name: true } },
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

export const toTrackingEventDto = (
  event: Pick<TrackingEvent, 'id' | 'status' | 'note' | 'createdAt'>,
): TrackingEventDto => ({
  id: event.id,
  status: event.status,
  note: event.note,
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
});

export const toShipmentDetailResponseDto = (
  shipment: ShipmentWith<typeof sellerShipmentDetailInclude>,
): ShipmentResponseDto => ({
  ...toShipmentResponseDto(shipment),
  trackingEvents: shipment.trackingEvents.map(toTrackingEventDto),
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
});

export const toCarrierShipmentDetailResponseDto = (
  shipment: ShipmentWith<typeof carrierShipmentDetailInclude>,
): CarrierShipmentDetailResponseDto => ({
  ...toCarrierShipmentResponseDto(shipment),
  trackingEvents: shipment.trackingEvents.map(toTrackingEventDto),
});

export const toAdminShipmentResponseDto = (
  shipment: ShipmentWith<typeof adminShipmentInclude>,
): AdminShipmentResponseDto => ({
  ...toCarrierShipmentResponseDto(shipment),
  carrierCompanyName: shipment.carrier.companyName,
});
