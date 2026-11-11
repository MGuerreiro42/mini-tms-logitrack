import { DEMO_LOGIN_ENABLED } from '@/lib/demo';

// Signups on the public demo are readable by every visitor signed in as the demo admin.
export function PublicDemoNotice() {
  if (!DEMO_LOGIN_ENABLED) return null;

  return (
    <p className="rounded-md bg-notice px-3 py-2 text-sm text-notice-foreground">
      This is a public demo. Anything you enter can be read by other visitors
      signed in as the demo admin. Don't use real company data.
    </p>
  );
}
