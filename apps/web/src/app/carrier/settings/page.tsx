import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CarrierCoverageConfig } from '@/features/carriers/components/carrier-coverage-config';
import { CarrierModalityConfig } from '@/features/carriers/components/carrier-modality-config';

export default function CarrierSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Modality & coverage configuration"
        description="Choose which modalities you operate and where you deliver."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Operated modalities</CardTitle>
        </CardHeader>
        <CardContent>
          <CarrierModalityConfig />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Coverage areas</CardTitle>
        </CardHeader>
        <CardContent>
          <CarrierCoverageConfig />
        </CardContent>
      </Card>
    </div>
  );
}
