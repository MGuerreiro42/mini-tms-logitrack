'use client';

import { PlusIcon, XIcon } from 'lucide-react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { FormField } from '@/components/common/form-field';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BR_STATES } from '@/lib/br-states';
import type { CoverageArea, CoverageAreaInput } from '../types';

interface AreaRow {
  state: string;
  city: string;
}

interface FormValues {
  areas: AreaRow[];
}

interface CoverageAreasEditorProps {
  initialAreas: CoverageArea[];
  onSave: (areas: CoverageAreaInput[]) => void;
  isSaving?: boolean;
  readOnly?: boolean;
}

function areaLabel(area: { state: string; city: string | null }) {
  return area.city ? `${area.city}/${area.state}` : `All of ${area.state}`;
}

const areaKey = (area: AreaRow) =>
  `${area.state}:${area.city.trim().toLowerCase()}`;

// Mount only once initialAreas is loaded, so RHF defaults are never seeded asynchronously.
export function CoverageAreasEditor({
  initialAreas,
  onSave,
  isSaving,
  readOnly,
}: CoverageAreasEditorProps) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      areas: initialAreas.map((area) => ({
        state: area.state,
        city: area.city ?? '',
      })),
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'areas' });

  function submit(values: FormValues) {
    onSave(
      values.areas.map((area) => ({
        state: area.state,
        city: area.city.trim() === '' ? undefined : area.city.trim(),
      })),
    );
  }

  if (readOnly) {
    return (
      <div className="flex flex-wrap gap-2">
        {initialAreas.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No coverage areas configured yet.
          </p>
        )}
        {initialAreas.map((area) => (
          <span
            key={area.id}
            className="rounded-sm bg-secondary px-2.5 py-1.5 text-[13px] font-medium text-secondary-foreground"
          >
            {areaLabel(area)}
          </span>
        ))}
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit(submit)}>
      {fields.length > 0 && (
        <ul className="flex flex-col gap-4">
          {fields.map((field, index) => {
            const stateId = `area-${field.id}-state`;
            return (
              <li
                key={field.id}
                className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-start gap-3"
              >
                <div className="space-y-1.5">
                  <Label htmlFor={stateId}>State</Label>
                  <Controller
                    control={control}
                    name={`areas.${index}.state`}
                    render={({ field: selectField }) => (
                      <Select
                        value={selectField.value}
                        onValueChange={selectField.onChange}
                      >
                        <SelectTrigger id={stateId} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BR_STATES.map((uf) => (
                            <SelectItem key={uf} value={uf}>
                              {uf}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <FormField
                  id={`area-${field.id}-city`}
                  label="City"
                  placeholder="Leave empty for the whole state"
                  error={errors.areas?.[index]?.city?.message}
                  {...register(`areas.${index}.city`, {
                    validate: (_city, { areas }) =>
                      areas.findIndex(
                        (area) => areaKey(area) === areaKey(areas[index]),
                      ) === index || 'This area is already listed.',
                  })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  className="mt-5"
                  aria-label={`Remove area ${index + 1}`}
                  onClick={() => remove(index)}
                >
                  <XIcon />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {fields.length === 0 && (
        <p className="rounded-md bg-notice px-3 py-2 text-sm text-notice-foreground">
          No coverage areas configured. Sellers won't find your company in any
          match until at least one exists.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => append({ state: 'SP', city: '' })}
        >
          <PlusIcon data-icon="inline-start" />
          Add area
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
