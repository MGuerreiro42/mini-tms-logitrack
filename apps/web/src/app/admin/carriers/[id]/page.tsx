import { CarrierDetailCard } from '@/features/carriers/components/carrier-detail-card';

export default async function AdminCarrierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CarrierDetailCard id={id} />;
}
