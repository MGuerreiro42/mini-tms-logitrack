import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CarrierCoverageConfig } from '@/features/carriers/components/carrier-coverage-config';
import { CarrierModalityConfig } from '@/features/carriers/components/carrier-modality-config';

const SECTIONS = [
  { title: 'Operated modalities', content: <CarrierModalityConfig /> },
  { title: 'Coverage areas', content: <CarrierCoverageConfig /> },
];

export default function CarrierSettingsPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Modalities & coverage"
        description="Choose which modalities you operate and where you deliver. Sellers only see carriers that match both."
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-start">
        {SECTIONS.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent>{section.content}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
