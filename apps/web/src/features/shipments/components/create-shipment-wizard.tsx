'use client';

import { useState } from 'react';
import { StepIndicator } from '@/components/common/step-indicator';
import type { ModalityOption } from '../types';
import { EligibleCarriersList } from './eligible-carriers-list';
import {
  type AddressFormValues,
  ShipmentAddressForm,
} from './shipment-address-form';
import { ShipmentConfirmReview } from './shipment-confirm-review';

type WizardState =
  | { step: 0 }
  | {
      step: 1;
      address: AddressFormValues;
      modality: ModalityOption;
      carrierId?: string;
    }
  | {
      step: 2;
      address: AddressFormValues;
      modality: ModalityOption;
      carrierId: string;
      carrierName: string;
    };

function stepsFor(state: WizardState) {
  return [
    {
      label: 'Destination',
      detail:
        state.step === 0
          ? 'Where it goes and how fast'
          : `${state.address.addressCity}, ${state.address.addressState} · ${state.modality.name}`,
    },
    {
      label: 'Carrier',
      detail: state.step === 2 ? state.carrierName : 'Pick who delivers',
    },
    { label: 'Review', detail: 'Confirm and create' },
  ];
}

export function CreateShipmentWizard({
  modalities,
}: {
  modalities: ModalityOption[];
}) {
  const [state, setState] = useState<WizardState>({ step: 0 });
  const [savedAddress, setSavedAddress] = useState<
    AddressFormValues | undefined
  >();

  function currentStep() {
    if (state.step === 0) {
      return (
        <ShipmentAddressForm
          modalities={modalities}
          defaultValues={savedAddress}
          onNext={(address, modality) => {
            setSavedAddress(address);
            setState({ step: 1, address, modality });
          }}
        />
      );
    }

    if (state.step === 1) {
      return (
        <EligibleCarriersList
          address={state.address}
          modality={state.modality}
          defaultCarrierId={state.carrierId}
          onBack={() => setState({ step: 0 })}
          onNext={(carrierId, carrierName) =>
            setState({ ...state, step: 2, carrierId, carrierName })
          }
        />
      );
    }

    const { address, modality, carrierId, carrierName } = state;
    return (
      <ShipmentConfirmReview
        input={{ ...address, carrierId }}
        modality={modality}
        carrierName={carrierName}
        onBack={() => setState({ step: 1, address, modality, carrierId })}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <StepIndicator steps={stepsFor(state)} current={state.step} />
      {currentStep()}
    </div>
  );
}
