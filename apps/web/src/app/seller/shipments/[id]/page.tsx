import { ShipmentDetailCard } from '@/features/shipments/components/shipment-detail-card';

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ShipmentDetailCard id={id} />;
}
