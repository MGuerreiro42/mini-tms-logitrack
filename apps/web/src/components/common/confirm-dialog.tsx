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
import { HTTP_STATUS } from '@/lib/http-status';
import { apiErrorMessage } from '@/lib/toast-api-error';
import { hasStatus } from '@/services/api-client';

interface ConfirmDialogProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  dismissLabel?: string;
  onConfirm: () => Promise<unknown>;
  onOpenChange?: (open: boolean) => void;
  variant?: 'default' | 'destructive';
  available?: boolean;
  unavailableTitle?: string;
  unavailableMessage?: string;
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
  available = true,
  unavailableTitle,
  unavailableMessage = 'This action is no longer available.',
  children,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [isConflict, setIsConflict] = useState(false);

  function applyOpen(next: boolean) {
    setOpen(next);
    setFailure(null);
    setIsConflict(false);
    onOpenChange?.(next);
  }

  function requestOpen(next: boolean) {
    if (!isConfirming) applyOpen(next);
  }

  async function confirm() {
    setIsConfirming(true);
    setFailure(null);
    try {
      await onConfirm();
      applyOpen(false);
    } catch (error) {
      setFailure(apiErrorMessage(error));
      setIsConflict(hasStatus(error, HTTP_STATUS.CONFLICT));
    } finally {
      setIsConfirming(false);
    }
  }

  // An open dialog outlives its action, so the user is told why instead of watching it vanish.
  if (!available && !open) return null;

  const isSettled = (!available || isConflict) && !isConfirming;
  const message = isSettled ? unavailableMessage : failure;

  return (
    <Dialog open={open} onOpenChange={requestOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{(isSettled && unavailableTitle) || title}</DialogTitle>
          {isSettled ? (
            <DialogDescription role="alert">{message}</DialogDescription>
          ) : (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        {children && (
          <fieldset disabled={isSettled || isConfirming} className="min-w-0">
            {children}
          </fieldset>
        )}
        {!isSettled && message && (
          <p role="alert" className="text-sm text-destructive">
            {message}
          </p>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button
              variant={isSettled ? 'strong' : 'secondary'}
              disabled={isConfirming}
            >
              {isSettled ? 'Got it' : dismissLabel}
            </Button>
          </DialogClose>
          {!isSettled && (
            <Button
              variant={variant === 'destructive' ? 'destructive' : 'default'}
              onClick={confirm}
              disabled={isConfirming}
            >
              {isConfirming ? 'Working…' : confirmLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
