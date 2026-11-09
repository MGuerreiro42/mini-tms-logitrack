import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsIn, Matches, ValidateBy } from 'class-validator';
import { toDigits, toUpperTrimmed } from '../transforms/normalize';

export const BR_STATES = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
];

const CPF_WEIGHTS = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

const checkDigit = (digits: string, weights: number[]) => {
  const sum = weights.reduce(
    (total, weight, i) => total + Number(digits[i]) * weight,
    0,
  );
  return sum % 11 < 2 ? 0 : 11 - (sum % 11);
};

// The full weights score the body plus the first check digit; without their head, the body alone.
const hasValidCheckDigits = (value: string, weights: number[]) =>
  value.length === weights.length + 1 &&
  /^\d+$/.test(value) &&
  !/^(\d)\1+$/.test(value) &&
  checkDigit(value, weights.slice(1)) === Number(value.at(-2)) &&
  checkDigit(value, weights) === Number(value.at(-1));

export const isCpf = (value: string) => hasValidCheckDigits(value, CPF_WEIGHTS);
export const isCnpj = (value: string) =>
  hasValidCheckDigits(value, CNPJ_WEIGHTS);

export const IsUf = () =>
  applyDecorators(
    Transform(toUpperTrimmed),
    IsIn(BR_STATES, { message: '$property must be a Brazilian state (UF)' }),
  );

export const IsCep = () =>
  applyDecorators(
    Transform(({ value }) =>
      typeof value === 'string' ? value.replace(/[-\s]/g, '') : value,
    ),
    Matches(/^\d{8}$/, { message: '$property must be a CEP of 8 digits' }),
  );

export const IsTaxId = ({ cpf = false, cnpj = false }) =>
  applyDecorators(
    Transform(toDigits),
    ValidateBy({
      name: 'isTaxId',
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' &&
          ((cpf && isCpf(value)) || (cnpj && isCnpj(value))),
        defaultMessage: () =>
          `$property must be a valid ${cpf && cnpj ? 'CPF or CNPJ' : cpf ? 'CPF' : 'CNPJ'}`,
      },
    }),
  );
