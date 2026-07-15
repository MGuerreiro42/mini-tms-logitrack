import { SellerProfileCard } from '@/features/sellers/components/seller-profile-card';

export default function SellerProfilePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">My profile</h1>
        <p className="text-sm text-muted-foreground">
          Resolved from your session token — you can never read another seller's
          record here.
        </p>
      </div>
      <SellerProfileCard />
    </div>
  );
}
