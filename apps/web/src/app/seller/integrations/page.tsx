import { PageHeader } from '@/components/common/page-header';
import { ApiKeysPanel } from '@/features/integrations/components/api-keys-panel';
import { WebhookEndpointCard } from '@/features/integrations/components/webhook-endpoint-card';

export default function SellerIntegrationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Send shipment updates to your systems and call the API."
      />
      <WebhookEndpointCard />
      <ApiKeysPanel />
    </div>
  );
}
