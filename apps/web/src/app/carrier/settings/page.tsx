import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CarrierCoverageConfig } from '@/features/carriers/components/carrier-coverage-config';
import { CarrierModalityConfig } from '@/features/carriers/components/carrier-modality-config';

export default function CarrierSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          Modality &amp; coverage configuration
        </h1>
        <p className="text-sm text-muted-foreground">
          Only the manager can change this. Full replace on save for both.
        </p>
      </div>
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
