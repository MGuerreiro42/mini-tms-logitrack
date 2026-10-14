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
    <div className="flex flex-col gap-4">
      <ul>
        {items.map((item) => (
          <li key={item.id} className="border-t border-muted first:border-0">
            <label
              htmlFor={`modality-${item.id}`}
              className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-3 has-disabled:cursor-default"
            >
              <span className="text-[15px] font-semibold">{item.name}</span>
              <Switch
                id={`modality-${item.id}`}
                checked={staged.has(item.id)}
                onCheckedChange={() => toggle(item.id)}
                disabled={readOnly}
              />
            </label>
          </li>
        ))}
      </ul>
      {note && <p className="text-[13px] text-muted-foreground">{note}</p>}
      {!readOnly && (
        <div className="flex justify-end border-t border-muted pt-4">
          <Button
            onClick={() => onSave(Array.from(staged))}
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      )}
    </div>
  );
}
