'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useLogout } from '@/hooks/use-logout';

export function SignOutButton({ children }: { children: ReactNode }) {
  return (
    <Button variant="link" onClick={useLogout()}>
      {children}
    </Button>
  );
}
