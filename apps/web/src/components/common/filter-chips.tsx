import { XIcon } from 'lucide-react';

export interface FilterChip {
  id: string;
  label: string;
  onRemove: () => void;
}

export function FilterChips({ chips }: { chips: FilterChip[] }) {
  if (chips.length === 0) return null;

  return (
    <ul aria-label="Active filters" className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <li
          key={chip.id}
          className="inline-flex h-7 items-center gap-1 rounded-full bg-selected pr-1 pl-3 text-[13px] font-semibold"
        >
          {chip.label}
          <button
            type="button"
            aria-label={`Remove ${chip.label}`}
            onClick={chip.onRemove}
            className="grid size-5 place-items-center rounded-full text-muted-foreground outline-none hover:bg-background/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:size-8"
          >
            <XIcon aria-hidden className="size-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}
