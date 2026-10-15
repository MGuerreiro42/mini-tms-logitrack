import { PageHeader } from '@/components/common/page-header';
import { SellerProfileCard } from '@/features/sellers/components/seller-profile-card';

export default function SellerProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="My profile"
        description="Your company details and account status."
      />
      <SellerProfileCard />
    </div>
  );
}
