'use client';

import { useIsMutating } from '@tanstack/react-query';
import { LOGIN_MUTATION_KEY, useLoginMutation } from '../hooks/use-login';
import { DEMO_ACCOUNTS } from '../lib/demo-accounts';
import { DemoRoleCard } from './demo-role-card';

// A failed sign-in shows in the login form's error, which reads every login attempt.
export function DemoPicker({ next }: { next?: string }) {
  const login = useLoginMutation(next);
  const signingIn = useIsMutating({ mutationKey: LOGIN_MUTATION_KEY }) > 0;

  return (
    <section
      aria-labelledby="demo-picker-title"
      className="flex flex-col gap-3"
    >
      <h2 id="demo-picker-title" className="text-[15px] font-semibold">
        Explore the demo · one click, no signup
      </h2>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {DEMO_ACCOUNTS.map(({ email, password, ...account }) => (
          <DemoRoleCard
            key={email}
            {...account}
            pending={login.isPending && login.variables?.email === email}
            disabled={signingIn}
            onSelect={() => login.mutate({ email, password })}
          />
        ))}
      </div>
    </section>
  );
}
