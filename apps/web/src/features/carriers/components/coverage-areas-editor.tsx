'use client';

import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BR_STATES } from '@/lib/br-states';
import type { CoverageArea, CoverageAreaInput } from '../types';

interface FormValues {
  areas: { state: string; city: string }[];
}

interface CoverageAreasEditorProps {
  initialAreas: CoverageArea[];
  onSave: (areas: CoverageAreaInput[]) => void;
  isSaving?: boolean;
  readOnly?: boolean;
}

// Rendered only once initialAreas is known (parent gates on the query's
// isLoading) — avoids reset()-timing issues from seeding RHF defaultValues
// asynchronously.
export function CoverageAreasEditor({
  initialAreas,
  onSave,
  isSaving,
  readOnly,
}: CoverageAreasEditorProps) {
  const { control, register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      areas: initialAreas.map((area) => ({
        state: area.state,
        city: area.city ?? '',
      })),
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'areas' });

  function submit(values: FormValues) {
    // An empty/blank city means "covers the entire state" — matches the
    // backend's null-city convention (CarrierCoverageArea.city nullable).
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
            className="rounded-md border bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700"
          >
            {area.city ? `${area.city}/${area.state}` : `All of ${area.state}`}
          </span>
        ))}
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(submit)}>
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-center gap-2">
            <Controller
              control={control}
              name={`areas.${index}.state`}
              render={({ field: selectField }) => (
                <Select
                  value={selectField.value}
                  onValueChange={selectField.onChange}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="UF" />
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
            <Input
              placeholder="City (leave empty for whole state)"
              className="flex-1"
              {...register(`areas.${index}.city`)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => remove(index)}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
      {fields.length === 0 && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          No coverage areas configured — this carrier won't show up in any
          seller's eligible-carriers match until at least one exists.
        </p>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ state: 'SP', city: '' })}
        >
          + Add area
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
