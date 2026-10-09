import { create } from 'zustand';

// One flag per route: each route mounts at most one socket subscription.
interface RealtimeState {
  connected: boolean;
  setConnected: (connected: boolean) => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  connected: false,
  setConnected: (connected) => set({ connected }),
}));
