import type { Ref } from 'react';
import type { FieldControlProps } from '@/components/common/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BR_STATES } from '@/lib/br-states';

interface UfSelectProps extends Partial<FieldControlProps> {
  value: string | undefined;
  onChange: (uf: string) => void;
  onBlur?: () => void;
  name?: string;
  ref?: Ref<HTMLButtonElement>;
  placeholder?: string;
}

export function UfSelect({
  value,
  onChange,
  onBlur,
  name,
  ref,
  placeholder,
  ...control
}: UfSelectProps) {
  return (
    <Select name={name} value={value ?? ''} onValueChange={onChange}>
      <SelectTrigger ref={ref} onBlur={onBlur} className="w-full" {...control}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {BR_STATES.map((uf) => (
          <SelectItem key={uf} value={uf}>
            {uf}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
