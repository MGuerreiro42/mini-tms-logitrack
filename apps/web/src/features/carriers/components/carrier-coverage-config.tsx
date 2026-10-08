'use client';

import { QueryState } from '@/components/common/query-state';
import { useSession } from '@/hooks/use-session';
import {
  useCoverageAreas,
  useSetCoverageAreas,
} from '../hooks/use-coverage-areas';
import { CoverageAreasEditor } from './coverage-areas-editor';

export function CarrierCoverageConfig() {
  const session = useSession();
  const query = useCoverageAreas();
  const setAreas = useSetCoverageAreas();

  return (
    <QueryState query={query} errorMessage="Couldn't load coverage areas.">
      {(areas) => (
        <CoverageAreasEditor
          initialAreas={areas}
          onSave={(input) => setAreas.mutate(input)}
          isSaving={setAreas.isPending}
          readOnly={session?.role !== 'CARRIER_MANAGER'}
        />
      )}
    </QueryState>
  );
}
