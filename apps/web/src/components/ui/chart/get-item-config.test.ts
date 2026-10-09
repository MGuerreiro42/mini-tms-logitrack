import { getItemConfig } from './get-item-config';

const config = {
  value: { label: 'Value' },
  standard: { label: 'Standard' },
};

describe('getItemConfig', () => {
  it('resolves the key named directly on the item', () => {
    expect(getItemConfig(config, { name: 'standard' }, 'name')).toBe(
      config.standard,
    );
  });

  it('resolves the key named inside the item data row', () => {
    const item = { payload: { modality: 'standard' } };
    expect(getItemConfig(config, item, 'modality')).toBe(config.standard);
  });

  it('falls back to the key itself', () => {
    expect(getItemConfig(config, { dataKey: 1 }, 'value')).toBe(config.value);
  });

  it('returns undefined for non-object items', () => {
    expect(getItemConfig(config, null, 'value')).toBeUndefined();
  });
});
