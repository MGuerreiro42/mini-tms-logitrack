'use client';

import { QueryState } from '@/components/common/query-state';
import { ModalityToggleList } from '@/features/modalities/components/modality-toggle-list';
import { useSession } from '@/hooks/use-session';
import {
  useMyCarrierModalities,
  useSetMyCarrierModalities,
} from '../hooks/use-my-carrier-modalities';

export function CarrierModalityConfig() {
  const session = useSession();
  const query = useMyCarrierModalities();
  const setModalities = useSetMyCarrierModalities();

  // Read is open to both MANAGER and OPERATOR — mutation is manager-only,
  // mirroring the existing manager-only rule for Operator Management.
  const readOnly = session?.role !== 'CARRIER_MANAGER';

  return (
    <QueryState query={query} errorMessage="Couldn't load modalities.">
      {(modalities) => (
        <ModalityToggleList
          items={modalities}
          onSave={(modalityIds) => setModalities.mutate(modalityIds)}
          isSaving={setModalities.isPending}
          readOnly={readOnly}
          note={
            readOnly
              ? 'Only the carrier manager can change this.'
              : 'Full replace on save — the complete desired set is sent every time.'
          }
        />
      )}
    </QueryState>
  );
}
