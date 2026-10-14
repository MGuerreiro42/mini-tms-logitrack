import { PageHeader } from '@/components/common/page-header';
import { CarrierProfileCard } from '@/features/carriers/components/carrier-profile-card';

export default function CarrierCompanyPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="My company"
        description="Your company details and account status."
      />
      <CarrierProfileCard />
    </div>
  );
}
