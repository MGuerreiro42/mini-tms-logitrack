'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ConfirmDialogProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  dismissLabel?: string;
  // The dialog closes once this settles; failures are reported by the caller (e.g. a mutation toast).
  onConfirm: () => Promise<unknown>;
  onOpenChange?: (open: boolean) => void;
  variant?: 'default' | 'destructive';
  children?: React.ReactNode;
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  dismissLabel = 'Cancel',
  onConfirm,
  onOpenChange,
  variant = 'default',
  children,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  function changeOpen(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
  }

  async function confirm() {
    setIsConfirming(true);
    try {
      await onConfirm();
    } catch {
      // Already surfaced by the caller.
    } finally {
      setIsConfirming(false);
      changeOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isConfirming}>
              {dismissLabel}
            </Button>
          </DialogClose>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={confirm}
            disabled={isConfirming}
          >
            {isConfirming ? 'Working…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
