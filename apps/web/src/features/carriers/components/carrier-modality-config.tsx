'use client';

import { ModalityToggleList } from '@/features/modalities/components/modality-toggle-list';
import { useSession } from '@/hooks/use-session';
import {
  useMyCarrierModalities,
  useSetMyCarrierModalities,
} from '../hooks/use-my-carrier-modalities';

export function CarrierModalityConfig() {
  const session = useSession();
  const { data: modalities, isLoading } = useMyCarrierModalities();
  const setModalities = useSetMyCarrierModalities();

  if (isLoading || !modalities) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  // Read is open to both MANAGER and OPERATOR — mutation is manager-only,
  // mirroring the existing manager-only rule for Operator Management.
  const readOnly = session?.role !== 'CARRIER_MANAGER';

  return (
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
  );
}
