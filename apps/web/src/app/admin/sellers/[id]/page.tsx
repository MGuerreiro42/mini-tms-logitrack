import { Seller360 } from '@/features/admin/components/seller-360';

export default async function AdminSellerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Seller360 id={id} />;
}
