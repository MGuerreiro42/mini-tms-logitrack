// Labels and descriptions come from the API's catalog; the web never hard-codes them.
export interface ChaosStatus {
  scenario: string;
  label: string;
  description: string;
  endsAt: string;
}

export interface DemoStatus {
  chaos: ChaosStatus | null;
  nextResetAt: string | null;
}

export interface ChaosScenario {
  id: string;
  label: string;
  description: string;
}

export interface ChaosRun {
  scenario: string;
  startedAt: string;
  endedAt: string;
  reason: 'expired' | 'admin' | 'reset';
}

export interface AdminDemo {
  lastResetAt: string | null;
  nextResetAt: string | null;
  chaos: (ChaosStatus & { startedAt: string; startedBy: string }) | null;
  cooldownUntil: string | null;
  scenarios: ChaosScenario[];
  runs: ChaosRun[];
}
