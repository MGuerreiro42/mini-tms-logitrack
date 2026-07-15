'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMyModalities } from '@/features/sellers/hooks/use-my-modalities';

// Mirrors CreateShipmentDto's address fields exactly (all required except
// addressComplement).
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
  defaultValues?: Partial<AddressFormValues>;
  onNext: (values: AddressFormValues, modalityName: string) => void;
}

export function ShipmentAddressForm({
  defaultValues,
  onNext,
}: ShipmentAddressFormProps) {
  const { data: modalities, isLoading } = useMyModalities();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(schema),
    // modalityId starts unset (never register()'d — it's only set via the
    // button clicks below), so it defaults to '' rather than undefined:
    // zod's `.min(1, 'Pick a modality')` message only applies to a string
    // that's too short, not to a value failing the base type check.
    defaultValues: { modalityId: '', ...defaultValues },
  });

  const selectedModalityId = watch('modalityId');
  // The dropdown is fed only by the seller's own enabled modalities, not the
  // full catalog (matches SCREENS.md's Create Shipment spec).
  const enabledModalities = (modalities ?? []).filter(
    (modality) => modality.enabled,
  );

  function submit(values: AddressFormValues) {
    const modality = enabledModalities.find((m) => m.id === values.modalityId);
    onNext(values, modality?.name ?? '');
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="text-sm">Destination address</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit(submit)}>
          <div className="grid grid-cols-2 gap-3">
            <Field
              id="addressZipCode"
              label="Zip code"
              error={errors.addressZipCode?.message}
            >
              <Input id="addressZipCode" {...register('addressZipCode')} />
            </Field>
            <Field
              id="addressState"
              label="State (UF)"
              error={errors.addressState?.message}
            >
              <Input
                id="addressState"
                {...register('addressState')}
                maxLength={2}
                className="uppercase"
              />
            </Field>
          </div>
          <Field
            id="addressCity"
            label="City"
            error={errors.addressCity?.message}
          >
            <Input id="addressCity" {...register('addressCity')} />
          </Field>
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <Field
              id="addressStreet"
              label="Street"
              error={errors.addressStreet?.message}
            >
              <Input id="addressStreet" {...register('addressStreet')} />
            </Field>
            <Field
              id="addressNumber"
              label="Number"
              error={errors.addressNumber?.message}
            >
              <Input id="addressNumber" {...register('addressNumber')} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              id="addressNeighborhood"
              label="Neighborhood"
              error={errors.addressNeighborhood?.message}
            >
              <Input
                id="addressNeighborhood"
                {...register('addressNeighborhood')}
              />
            </Field>
            <Field id="addressComplement" label="Complement (optional)">
              <Input
                id="addressComplement"
                {...register('addressComplement')}
              />
            </Field>
          </div>
          <div className="space-y-1.5">
            <Label>Modality — your own enabled modalities only</Label>
            {isLoading && (
              <p className="text-sm text-muted-foreground">Loading…</p>
            )}
            {!isLoading && enabledModalities.length === 0 && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                You haven't enabled any modality yet. Go to Modalities first.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {enabledModalities.map((modality) => (
                <button
                  key={modality.id}
                  type="button"
                  onClick={() => setValue('modalityId', modality.id)}
                  className={`rounded-md border px-3 py-2 text-left text-sm ${
                    selectedModalityId === modality.id
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border'
                  }`}
                >
                  {modality.name}
                </button>
              ))}
            </div>
            {errors.modalityId && (
              <p className="text-sm text-destructive">
                {errors.modalityId.message}
              </p>
            )}
          </div>
          <Button type="submit">See eligible carriers →</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
