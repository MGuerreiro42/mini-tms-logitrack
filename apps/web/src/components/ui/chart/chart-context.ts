'use client';

import { createContext, useContext } from 'react';
import type { ChartConfig } from './chart-config';

export const ChartContext = createContext<{ config: ChartConfig } | null>(null);

export function useChart() {
  const context = useContext(ChartContext);
  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />');
  }
  return context;
}
