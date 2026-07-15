import { CreateShipmentWizard } from '@/features/shipments/components/create-shipment-wizard';

export default function CreateShipmentPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Create shipment</h1>
        <p className="text-sm text-muted-foreground">
          Address + modality → eligible carriers → confirm. Everything is
          re-validated server-side on the final step.
        </p>
      </div>
      <CreateShipmentWizard />
    </div>
  );
}
