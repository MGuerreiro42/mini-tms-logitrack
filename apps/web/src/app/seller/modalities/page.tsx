import { PageHeader } from '@/components/common/page-header';
import { SellerModalityConfig } from '@/features/sellers/components/seller-modality-config';

export default function SellerModalitiesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Modality configuration"
        description="Choose the delivery modalities you offer."
      />
      <SellerModalityConfig />
    </div>
  );
}
