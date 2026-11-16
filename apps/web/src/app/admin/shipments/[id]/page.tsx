import { AdminShipmentDetail } from '@/features/shipments/components/admin-shipment-detail';

export default async function AdminShipmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminShipmentDetail id={id} />;
}
