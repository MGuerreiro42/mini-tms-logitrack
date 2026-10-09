import { SellerModalityConfig } from '@/features/sellers/components/seller-modality-config';

export default function SellerModalitiesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Modality configuration</h1>
        <p className="text-sm text-muted-foreground">
          Choose the delivery modalities you offer.
        </p>
      </div>
      <SellerModalityConfig />
    </div>
  );
}
