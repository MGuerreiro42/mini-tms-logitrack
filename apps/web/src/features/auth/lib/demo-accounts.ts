import type { LoginInput } from '../types';

// Mirrors the API's SEED_DEMO: only turn it on where the demo accounts are seeded.
export const DEMO_LOGIN_ENABLED = process.env.NEXT_PUBLIC_DEMO_LOGIN === 'true';

const DEMO_PASSWORD = 'demo12345';

// Admin is left out: its password comes from ADMIN_PASSWORD and isn't public.
export const DEMO_ACCOUNTS: ReadonlyArray<{ label: string } & LoginInput> = [
  {
    label: 'Seller',
    email: 'seller@demo.minitms.dev',
    password: DEMO_PASSWORD,
  },
  {
    label: 'Carrier',
    email: 'carrier@demo.minitms.dev',
    password: DEMO_PASSWORD,
  },
  {
    label: 'Operator',
    email: 'operator1@demo.minitms.dev',
    password: DEMO_PASSWORD,
  },
];
