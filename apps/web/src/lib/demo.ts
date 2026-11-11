// Marks this deployment as the public demo; mirrors the API's SEED_DEMO, so only turn it on where
// the demo accounts are seeded. Gates the demo logins and the global banner.
export const DEMO_LOGIN_ENABLED = process.env.NEXT_PUBLIC_DEMO_LOGIN === 'true';

// Every seeded demo account, whose shared password is public.
export const DEMO_EMAIL_DOMAIN = '@demo.minitms.dev';
