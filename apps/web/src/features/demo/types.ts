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
