'use client';

import { createContext, use } from 'react';

export interface SidebarState {
  // True while the sidebar shows as the 64 px rail.
  compact: boolean;
  toggle: () => void;
}

export const SidebarContext = createContext<SidebarState>({
  compact: false,
  toggle: () => {},
});

export const useSidebar = () => use(SidebarContext);
