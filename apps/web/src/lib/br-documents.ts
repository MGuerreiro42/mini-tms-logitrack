import type { UseFormRegisterReturn } from 'react-hook-form';

const CPF_LENGTH = 11;
const CNPJ_LENGTH = 14;
const CEP_LENGTH = 8;

export function toDigits(value: string): string {
  return value.replace(/\D/g, '');
}

// Formats as far as the digits go, so the same helper masks while typing and on display.
function mask(value: string, pattern: string): string {
  const digits = toDigits(value);
  let result = '';
  let next = 0;
  for (const char of pattern) {
    if (next === digits.length) break;
    result += char === '0' ? digits[next++] : char;
  }
  return result;
}

export function formatCep(value: string): string {
  return mask(value, '00000-000');
}

export function formatCnpj(value: string): string {
  return mask(value, '00.000.000/0000-00');
}

export function formatTaxId(value: string): string {
  return toDigits(value).length > CPF_LENGTH
    ? formatCnpj(value)
    : mask(value, '000.000.000-00');
}

export function isCep(value: string): boolean {
  return toDigits(value).length === CEP_LENGTH;
}

// Mod 11 with weights from 2 rising right to left; CNPJ weights wrap back to 2 after 9.
function checkDigit(body: string, maxWeight: number): number {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const weight = ((body.length - 1 - i) % (maxWeight - 1)) + 2;
    sum += Number(body[i]) * weight;
  }
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

function hasCheckDigits(digits: string, maxWeight: number): boolean {
  if (/^(\d)\1*$/.test(digits)) return false;
  const body = digits.slice(0, -2);
  const first = checkDigit(body, maxWeight);
  return digits.endsWith(`${first}${checkDigit(body + first, maxWeight)}`);
}

export function isCpf(value: string): boolean {
  const digits = toDigits(value);
  return digits.length === CPF_LENGTH && hasCheckDigits(digits, 11);
}

export function isCnpj(value: string): boolean {
  const digits = toDigits(value);
  return digits.length === CNPJ_LENGTH && hasCheckDigits(digits, 9);
}

// Rewrites the input before react-hook-form reads it, so the field holds the masked value.
export function withMask<T extends UseFormRegisterReturn>(
  field: T,
  format: (value: string) => string,
): T {
  return {
    ...field,
    onChange: (event) => {
      event.target.value = format(event.target.value);
      return field.onChange(event);
    },
  };
}
