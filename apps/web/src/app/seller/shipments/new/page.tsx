import { PageHeader } from '@/components/common/page-header';
import { getDeliveryModalities } from '@/features/modalities/api';
import { getMyModalities } from '@/features/sellers/api';
import { CreateShipmentWizard } from '@/features/shipments/components/create-shipment-wizard';
import { requireSegment, withAuthRedirects } from '@/lib/server-session';

export default async function CreateShipmentPage() {
  const { token } = await requireSegment('seller');
  const [mine, catalog] = await Promise.all([
    withAuthRedirects(getMyModalities(token)),
    withAuthRedirects(getDeliveryModalities(token)),
  ]);
  const modalities = mine
    .filter((modality) => modality.enabled)
    .map(({ id, name }) => ({
      id,
      name,
      slaHours: catalog.find((entry) => entry.id === id)?.slaHours,
    }));

  return (
    <div className="mx-auto max-w-300 space-y-6">
      <PageHeader
        title="Create shipment"
        description="Only carriers that cover the destination and offer the chosen modality are listed."
      />
      <CreateShipmentWizard modalities={modalities} />
    </div>
  );
}
