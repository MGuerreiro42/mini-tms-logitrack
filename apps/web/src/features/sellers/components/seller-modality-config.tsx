'use client';

import { QueryState } from '@/components/common/query-state';
import { ModalityToggleList } from '@/features/modalities/components/modality-toggle-list';
import {
  useMyModalities,
  useSetMyModalities,
} from '../hooks/use-my-modalities';

export function SellerModalityConfig() {
  const query = useMyModalities();
  const setModalities = useSetMyModalities();

  return (
    <QueryState query={query} errorMessage="Couldn't load modalities.">
      {(modalities) => (
        <ModalityToggleList
          items={modalities}
          onSave={(modalityIds) => setModalities.mutate(modalityIds)}
          isSaving={setModalities.isPending}
          note="Independent of what any carrier actually offers — checked only at shipment creation time, not enforced here."
        />
      )}
    </QueryState>
  );
}
