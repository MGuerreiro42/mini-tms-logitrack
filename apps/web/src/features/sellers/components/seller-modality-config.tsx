'use client';

import { Panel } from '@/components/common/panel';
import { QuerySkeleton, QueryState } from '@/components/common/query-state';
import { ModalityToggleList } from '@/features/modalities/components/modality-toggle-list';
import {
  useMyModalities,
  useSetMyModalities,
} from '../hooks/use-my-modalities';

export function SellerModalityConfig() {
  const query = useMyModalities();
  const setModalities = useSetMyModalities();

  return (
    <QueryState
      skeleton={<QuerySkeleton />}
      query={query}
      errorMessage="Couldn't load modalities."
    >
      {(modalities) => (
        <Panel title="Modalities you offer" className="max-w-2xl gap-2">
          <ModalityToggleList
            items={modalities}
            onSave={(modalityIds) => setModalities.mutate(modalityIds)}
            isSaving={setModalities.isPending}
            note="Carriers are matched against these when you create a shipment."
          />
        </Panel>
      )}
    </QueryState>
  );
}
