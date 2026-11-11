import type { ChaosState } from './chaos.service';

export const DEMO_CHAOS_CHANGED = 'demo.chaos-changed';

// The run that started (active) or ended, so a listener knows which scenario to undo.
export interface DemoChaosChangedEvent {
  run: ChaosState;
  active: boolean;
}
