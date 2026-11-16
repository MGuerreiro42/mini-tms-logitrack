import {
  type LucideIcon,
  ShieldCheckIcon,
  StoreIcon,
  TruckIcon,
  UserRoundCheckIcon,
} from 'lucide-react';
import { DEMO_ADMIN_EMAIL } from '@/lib/demo';
import type { LoginInput } from '../types';

const DEMO_PASSWORD = 'demo12345';

export interface DemoAccount extends LoginInput {
  label: string;
  icon: LucideIcon;
  persona: string;
  description: string;
}

// The demo admin's password is public too: it reads every tenant but the API refuses its
// sign-up decisions (spec 08 FR-002).
export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    label: 'Seller',
    icon: StoreIcon,
    persona: 'Lucas Pereira · Loja Demo',
    description:
      'Create a shipment, watch it move on the map, read its webhooks.',
    email: 'seller@demo.minitms.dev',
    password: DEMO_PASSWORD,
  },
  {
    label: 'Carrier manager',
    icon: TruckIcon,
    persona: 'Carlos Mendes · Transportadora Demo',
    description: "See the team's queue and on-time performance.",
    email: 'carrier@demo.minitms.dev',
    password: DEMO_PASSWORD,
  },
  {
    label: 'Operator',
    icon: UserRoundCheckIcon,
    persona: 'Ana Souza · Transportadora Demo',
    description: 'Claim the most urgent shipment and move it to the doorstep.',
    email: 'operator1@demo.minitms.dev',
    password: DEMO_PASSWORD,
  },
  {
    label: 'Admin',
    icon: ShieldCheckIcon,
    persona: 'Demo admin',
    description: 'Approvals, platform pulse and Chaos Mode on demo data.',
    email: DEMO_ADMIN_EMAIL,
    password: DEMO_PASSWORD,
  },
];
