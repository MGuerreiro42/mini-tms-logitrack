import { PageHeader } from '@/components/common/page-header';
import { CarrierProfileCard } from '@/features/carriers/components/carrier-profile-card';

export default function CarrierCompanyPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="My company"
        description="Your company details and account status."
      />
      <CarrierProfileCard />
    </div>
  );
}
