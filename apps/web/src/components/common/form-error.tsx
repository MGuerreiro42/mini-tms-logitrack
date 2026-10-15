import { apiErrorMessage } from '@/lib/toast-api-error';

export function FormError({ error }: { error: unknown }) {
  if (!error) return null;

  return (
    <p
      role="alert"
      className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {apiErrorMessage(error)}
    </p>
  );
}
