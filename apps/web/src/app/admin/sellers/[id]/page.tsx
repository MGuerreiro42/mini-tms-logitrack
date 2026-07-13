import { SellerDetailCard } from '@/features/sellers/components/seller-detail-card';

export default async function AdminSellerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SellerDetailCard id={id} />;
}
