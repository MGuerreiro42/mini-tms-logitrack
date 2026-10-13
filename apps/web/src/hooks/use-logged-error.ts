'use client';

import { useEffect } from 'react';

export function useLoggedError(error: Error): void {
  useEffect(() => {
    console.error(error);
  }, [error]);
}
