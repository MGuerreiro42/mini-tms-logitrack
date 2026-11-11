// Marks this deployment as the public demo; mirrors the API's SEED_DEMO, so only turn it on where
// the demo accounts are seeded. Gates the demo logins and the global banner.
export const DEMO_LOGIN_ENABLED = process.env.NEXT_PUBLIC_DEMO_LOGIN === 'true';

// Its password is public, so the API refuses its sign-up decisions (spec 08 FR-002).
export const DEMO_ADMIN_EMAIL = 'admin@demo.minitms.dev';
export const DEMO_ADMIN_DECISION_NOTE =
  "The demo admin can't approve or reject sign-ups";
