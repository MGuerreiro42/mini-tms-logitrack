import type { QueryClient } from '@tanstack/react-query';
import { hardNavigate } from './hard-navigate';
import { clearSession } from './session';

export function restartApp(queryClient: QueryClient, path: string): void {
  queryClient.clear();
  hardNavigate(path);
}

export function endSession(queryClient: QueryClient, path: string): void {
  clearSession();
  restartApp(queryClient, path);
}
