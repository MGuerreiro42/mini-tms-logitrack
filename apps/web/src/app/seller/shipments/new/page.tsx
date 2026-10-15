import { PageHeader } from '@/components/common/page-header';
import { getMyModalities } from '@/features/sellers/api';
import { CreateShipmentWizard } from '@/features/shipments/components/create-shipment-wizard';
import { requireSegment, withAuthRedirects } from '@/lib/server-session';

export default async function CreateShipmentPage() {
  const { token } = await requireSegment('seller');
  const modalities = (await withAuthRedirects(getMyModalities(token))).filter(
    (m) => m.enabled,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create shipment"
        description="Enter the destination, pick a carrier and confirm."
      />
      <CreateShipmentWizard modalities={modalities} />
    </div>
  );
}
