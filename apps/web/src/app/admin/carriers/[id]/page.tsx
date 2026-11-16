import { Carrier360 } from '@/features/admin/components/carrier-360';

export default async function AdminCarrierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Carrier360 id={id} />;
}
