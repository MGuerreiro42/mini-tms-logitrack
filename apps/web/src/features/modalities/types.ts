export interface DeliveryModality {
  id: string;
  code: string;
  name: string;
  slaHours: number | null;
}

export interface ModalityToggle {
  id: string;
  code: string;
  name: string;
  enabled: boolean;
}
