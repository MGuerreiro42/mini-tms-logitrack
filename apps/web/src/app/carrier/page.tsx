import { CarrierProfileCard } from '@/features/carriers/components/carrier-profile-card';

export default function CarrierCompanyPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">My company</h1>
        <p className="text-sm text-muted-foreground">
          Manager and operator both see this — only the manager can change
          what's downstream.
        </p>
      </div>
      <CarrierProfileCard />
    </div>
  );
}
