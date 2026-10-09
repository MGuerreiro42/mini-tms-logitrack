'use client';

import { useState } from 'react';
import type { CreateShipmentInput } from '../types';
import { EligibleCarriersList } from './eligible-carriers-list';
import {
  type AddressFormValues,
  ShipmentAddressForm,
} from './shipment-address-form';
import { ShipmentConfirmReview } from './shipment-confirm-review';

// Local step state, not routes: nothing persists before the final POST.
type WizardState =
  | { step: 1 }
  | {
      step: 2;
      address: AddressFormValues;
      modalityName: string;
      carrierId?: string;
    }
  | {
      step: 3;
      address: AddressFormValues;
      modalityName: string;
      carrierId: string;
      carrierName: string;
    };

export function CreateShipmentWizard() {
  const [state, setState] = useState<WizardState>({ step: 1 });
  // Kept outside the step state so Back to step 1 keeps the typed address.
  const [savedAddress, setSavedAddress] = useState<
    AddressFormValues | undefined
  >();

  if (state.step === 1) {
    return (
      <ShipmentAddressForm
        defaultValues={savedAddress}
        onNext={(address, modalityName) => {
          setSavedAddress(address);
          setState({ step: 2, address, modalityName });
        }}
      />
    );
  }

  if (state.step === 2) {
    return (
      <EligibleCarriersList
        state={state.address.addressState}
        city={state.address.addressCity}
        modalityId={state.address.modalityId}
        defaultCarrierId={state.carrierId}
        onBack={() => setState({ step: 1 })}
        onNext={(carrierId, carrierName) =>
          setState({ ...state, step: 3, carrierId, carrierName })
        }
      />
    );
  }

  const input: CreateShipmentInput = {
    addressStreet: state.address.addressStreet,
    addressNumber: state.address.addressNumber,
    addressComplement: state.address.addressComplement,
    addressNeighborhood: state.address.addressNeighborhood,
    addressCity: state.address.addressCity,
    addressState: state.address.addressState,
    addressZipCode: state.address.addressZipCode,
    modalityId: state.address.modalityId,
    carrierId: state.carrierId,
  };

  return (
    <ShipmentConfirmReview
      input={input}
      modalityName={state.modalityName}
      carrierName={state.carrierName}
      onBack={() =>
        setState({
          step: 2,
          address: state.address,
          modalityName: state.modalityName,
          carrierId: state.carrierId,
        })
      }
    />
  );
}
