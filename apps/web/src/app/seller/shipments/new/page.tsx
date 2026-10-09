import { CreateShipmentWizard } from '@/features/shipments/components/create-shipment-wizard';

export default function CreateShipmentPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Create shipment</h1>
        <p className="text-sm text-muted-foreground">
          Enter the destination, pick a carrier and confirm.
        </p>
      </div>
      <CreateShipmentWizard />
    </div>
  );
}
