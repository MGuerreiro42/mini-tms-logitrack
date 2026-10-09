import { CarrierProfileCard } from '@/features/carriers/components/carrier-profile-card';

export default function CarrierCompanyPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">My company</h1>
        <p className="text-sm text-muted-foreground">
          Your company details and account status.
        </p>
      </div>
      <CarrierProfileCard />
    </div>
  );
}
