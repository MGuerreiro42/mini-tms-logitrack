export const CHAOS_SCENARIOS = [
  {
    id: 'failed-deliveries',
    label: 'Storm: failed deliveries',
    description: 'About half of the deliveries fail, then return to sender.',
  },
  {
    id: 'carrier-outage',
    label: 'Transportadora Demo outage',
    description:
      'The carrier stops claiming and moving shipments; the queue piles up.',
  },
  {
    id: 'webhook-down',
    label: 'Webhook endpoints down',
    description:
      "The demo sellers' webhook inbox answers 500; deliveries retry with backoff.",
  },
] as const;

export type ChaosScenario = (typeof CHAOS_SCENARIOS)[number];
export type ChaosScenarioId = ChaosScenario['id'];
