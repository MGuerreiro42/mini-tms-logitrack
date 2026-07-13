'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { ModalityToggle } from '../types';

interface ModalityToggleListProps {
  items: ModalityToggle[];
  onSave: (modalityIds: string[]) => void;
  isSaving?: boolean;
  readOnly?: boolean;
  note?: string;
}

// One "Save" button, not one PUT per toggle — the backend endpoint is a full
// replace, so batching avoids a round-trip per click and gives an implicit
// "cancel" (don't hit Save) for free.
export function ModalityToggleList({
  items,
  onSave,
  isSaving,
  readOnly,
  note,
}: ModalityToggleListProps) {
  const [staged, setStaged] = useState(
    () => new Set(items.filter((item) => item.enabled).map((item) => item.id)),
  );

  function toggle(id: string) {
    setStaged((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="divide-y rounded-lg border">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 px-4 py-3">
            <div className="flex-1">
              <div className="text-sm font-semibold">{item.name}</div>
              <div className="text-xs text-muted-foreground">{item.code}</div>
            </div>
            <Switch
              checked={staged.has(item.id)}
              onCheckedChange={() => toggle(item.id)}
              disabled={readOnly}
            />
          </div>
        ))}
      </div>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
      {!readOnly && (
        <Button onClick={() => onSave(Array.from(staged))} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save changes'}
        </Button>
      )}
    </div>
  );
}
