import { getMyModalities } from '@/features/sellers/api';
import { CreateShipmentWizard } from '@/features/shipments/components/create-shipment-wizard';
import { getServerSession } from '@/lib/server-session';

export default async function CreateShipmentPage() {
  const token = (await getServerSession())?.token ?? '';
  const modalities = (await getMyModalities(token)).filter((m) => m.enabled);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Create shipment</h1>
        <p className="text-sm text-muted-foreground">
          Enter the destination, pick a carrier and confirm.
        </p>
      </div>
      <CreateShipmentWizard modalities={modalities} />
    </div>
  );
}
