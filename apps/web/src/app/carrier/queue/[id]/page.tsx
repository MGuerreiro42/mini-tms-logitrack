import { CarrierShipmentDetail } from '@/features/shipments/components/carrier-shipment-detail';

export default async function CarrierQueueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CarrierShipmentDetail id={id} />;
}
