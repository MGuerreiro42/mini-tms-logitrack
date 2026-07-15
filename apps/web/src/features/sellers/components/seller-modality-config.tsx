'use client';

import { ModalityToggleList } from '@/features/modalities/components/modality-toggle-list';
import {
  useMyModalities,
  useSetMyModalities,
} from '../hooks/use-my-modalities';

export function SellerModalityConfig() {
  const { data: modalities, isLoading } = useMyModalities();
  const setModalities = useSetMyModalities();

  if (isLoading || !modalities) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <ModalityToggleList
      items={modalities}
      onSave={(modalityIds) => setModalities.mutate(modalityIds)}
      isSaving={setModalities.isPending}
      note="Independent of what any carrier actually offers — checked only at shipment creation time, not enforced here."
    />
  );
}
