'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormField } from '@/components/common/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { ModalityOption } from '../types';

const schema = z.object({
  addressStreet: z.string().min(1, 'Required'),
  addressNumber: z.string().min(1, 'Required'),
  addressComplement: z.string().optional(),
  addressNeighborhood: z.string().min(1, 'Required'),
  addressCity: z.string().min(1, 'Required'),
  addressState: z.string().min(1, 'Required'),
  addressZipCode: z.string().min(1, 'Required'),
  modalityId: z.string().min(1, 'Pick a modality'),
});

export type AddressFormValues = z.infer<typeof schema>;

interface ShipmentAddressFormProps {
  modalities: ModalityOption[];
  defaultValues?: Partial<AddressFormValues>;
  onNext: (values: AddressFormValues, modality: ModalityOption) => void;
}

export function ShipmentAddressForm({
  modalities,
  defaultValues,
  onNext,
}: ShipmentAddressFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(schema),
    // '' rather than undefined so zod reports 'Pick a modality' instead of a type error.
    defaultValues: { modalityId: '', ...defaultValues },
  });

  function submit(values: AddressFormValues) {
    const modality = modalities.find((m) => m.id === values.modalityId);
    if (modality) onNext(values, modality);
  }

  const field = (name: Exclude<keyof AddressFormValues, 'modalityId'>) => ({
    id: name,
    error: errors[name]?.message,
    ...register(name),
  });

  return (
    <Card className="max-w-3xl px-6 py-5.5">
      <form className="flex flex-col gap-5" onSubmit={handleSubmit(submit)}>
        <h2 className="text-base font-semibold">Destination address</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Zip code" {...field('addressZipCode')} />
          <FormField
            label="State (UF)"
            maxLength={2}
            className="uppercase"
            {...field('addressState')}
          />
          <div className="md:col-span-2">
            <FormField label="City" {...field('addressCity')} />
          </div>
          <div className="grid gap-4 md:col-span-2 md:grid-cols-[minmax(0,1fr)_8rem]">
            <FormField label="Street" {...field('addressStreet')} />
            <FormField label="Number" {...field('addressNumber')} />
          </div>
          <FormField label="Neighborhood" {...field('addressNeighborhood')} />
          <FormField
            label="Complement (optional)"
            {...field('addressComplement')}
          />
        </div>
        <fieldset
          aria-describedby={errors.modalityId ? 'modalityId-error' : undefined}
          className="flex flex-col gap-2.5"
        >
          <legend className="mb-2.5 text-sm font-semibold">Modality</legend>
          {modalities.length === 0 && (
            <p className="rounded-md bg-notice px-3 py-2 text-[13px] text-notice-foreground">
              You haven't enabled any modality yet.{' '}
              <Link href="/seller/modalities" className="font-medium underline">
                Enable one in Modalities
              </Link>
              .
            </p>
          )}
          <div className="grid gap-2.5 sm:grid-cols-3">
            {modalities.map((modality) => (
              <label
                key={modality.id}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-input bg-field px-3.5 py-2.5 text-sm has-checked:border-primary has-checked:bg-selected has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
              >
                <input
                  type="radio"
                  value={modality.id}
                  className="size-4 shrink-0 accent-primary outline-none"
                  {...register('modalityId')}
                />
                <span className="flex flex-col">
                  <span className="font-semibold">{modality.name}</span>
                  {modality.slaHours ? (
                    <span className="text-[13px] text-muted-foreground">
                      Within {modality.slaHours} h
                    </span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
          {errors.modalityId && (
            <p
              id="modalityId-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {errors.modalityId.message}
            </p>
          )}
        </fieldset>
        <div className="flex justify-end border-t border-muted pt-4">
          <Button type="submit">See eligible carriers</Button>
        </div>
      </form>
    </Card>
  );
}
