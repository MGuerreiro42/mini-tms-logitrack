import type { ComponentProps, ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface FieldControlProps {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby': string | undefined;
}

interface FormFieldProps extends ComponentProps<typeof Input> {
  id: string;
  label: string;
  error?: string;
  // Renders another control (e.g. a select) in place of the input, with the same wiring.
  control?: (props: FieldControlProps) => ReactNode;
}

export function FormField({
  id,
  label,
  error,
  control,
  ...inputProps
}: FormFieldProps) {
  const errorId = `${id}-error`;
  const controlProps: FieldControlProps = {
    id,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? errorId : undefined,
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {control ? (
        control(controlProps)
      ) : (
        <Input {...controlProps} {...inputProps} />
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
