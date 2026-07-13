'use client';

import { useSession } from '@/hooks/use-session';
import {
  useCoverageAreas,
  useSetCoverageAreas,
} from '../hooks/use-coverage-areas';
import { CoverageAreasEditor } from './coverage-areas-editor';

export function CarrierCoverageConfig() {
  const session = useSession();
  const { data: areas, isLoading } = useCoverageAreas();
  const setAreas = useSetCoverageAreas();

  if (isLoading || !areas) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <CoverageAreasEditor
      initialAreas={areas}
      onSave={(input) => setAreas.mutate(input)}
      isSaving={setAreas.isPending}
      readOnly={session?.role !== 'CARRIER_MANAGER'}
    />
  );
}
