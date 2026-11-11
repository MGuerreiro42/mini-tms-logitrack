// Marks this deployment as the public demo; mirrors the API's SEED_DEMO, so only turn it on where
// the demo accounts are seeded. Gates the demo logins and the global banner.
export const DEMO_LOGIN_ENABLED = process.env.NEXT_PUBLIC_DEMO_LOGIN === 'true';

// Every seeded demo account, whose shared password is public.
export const DEMO_EMAIL_DOMAIN = '@demo.minitms.dev';

// Its password is public, so the API refuses its sign-up decisions (spec 08 FR-002).
export const DEMO_ADMIN_EMAIL = `admin${DEMO_EMAIL_DOMAIN}`;
export const DEMO_ADMIN_DECISION_NOTE =
  "The demo admin can't approve or reject sign-ups";
