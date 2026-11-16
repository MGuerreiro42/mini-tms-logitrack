import type { LoginInput } from '../types';

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
