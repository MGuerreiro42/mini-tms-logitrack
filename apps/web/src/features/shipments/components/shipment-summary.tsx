import type { ReactNode } from 'react';
import { Panel } from '@/components/common/panel';
import type { ModalityOption, ShipmentAddress } from '../types';

export type SummaryAddress = Omit<ShipmentAddress, 'addressComplement'> & {
  addressComplement?: string | null;
};

export function modalityLabel(modality: ModalityOption): string {
  return modality.slaHours
    ? `${modality.name} · delivered within ${modality.slaHours} h`
    : modality.name;
}

interface ShipmentSummaryProps {
  title: string;
  address: SummaryAddress;
  modality: ModalityOption;
  carrierName?: string;
  children: ReactNode;
}

export function ShipmentSummary({
  title,
  address,
  modality,
  carrierName,
  children,
}: ShipmentSummaryProps) {
  return (
    <Panel
      title={title}
      footer={
        <div className="mt-auto flex flex-col gap-3 border-t border-muted pt-4">
          {children}
        </div>
      }
    >
      <dl className="flex flex-col gap-3.5 text-sm">
        <SummaryRow label="Destination">
          <span className="block">
            {address.addressStreet}, {address.addressNumber}
            {address.addressComplement && ` · ${address.addressComplement}`}
          </span>
          <span className="block">
            {address.addressNeighborhood}, {address.addressCity},{' '}
            {address.addressState} ·{' '}
            <span className="font-mono">{address.addressZipCode}</span>
          </span>
        </SummaryRow>
        <SummaryRow label="Modality">{modalityLabel(modality)}</SummaryRow>
        <SummaryRow label="Carrier">
          {carrierName ? (
            <span className="font-semibold">{carrierName}</span>
          ) : (
            <span className="text-muted-foreground">Not chosen yet</span>
          )}
        </SummaryRow>
      </dl>
    </Panel>
  );
}

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="leading-normal">{children}</dd>
    </div>
  );
}
