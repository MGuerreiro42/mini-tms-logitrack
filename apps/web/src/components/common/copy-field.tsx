'use client';

import { CopyIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface CopyFieldProps {
  value: string;
  label: string;
  copiedMessage?: string;
  failedMessage?: string;
}

export function CopyField({
  value,
  label,
  copiedMessage = 'Copied',
  failedMessage = "Couldn't copy",
}: CopyFieldProps) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(copiedMessage);
    } catch {
      toast.error(failedMessage);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="min-w-0 flex-1 truncate rounded-md border bg-muted/50 px-3 py-2 font-mono text-xs hover:underline"
      >
        {value}
      </a>
      <Button
        type="button"
        size="icon"
        variant="outline"
        aria-label={label}
        onClick={copy}
      >
        <CopyIcon />
      </Button>
    </div>
  );
}
