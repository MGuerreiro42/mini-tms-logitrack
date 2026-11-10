import { initialsFor } from '@/lib/initials';

// Decorative: the name it stands for is always written next to it.
export function InitialsAvatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-semibold text-foreground"
    >
      {initialsFor(name)}
    </span>
  );
}
