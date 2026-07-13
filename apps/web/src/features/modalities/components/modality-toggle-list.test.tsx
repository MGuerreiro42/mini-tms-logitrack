import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ModalityToggle } from '../types';
import { ModalityToggleList } from './modality-toggle-list';

const items: ModalityToggle[] = [
  { id: 'modality-1', code: 'STANDARD', name: 'Standard', enabled: true },
  { id: 'modality-2', code: 'EXPRESS', name: 'Express', enabled: false },
];

describe('ModalityToggleList', () => {
  it('seeds the switches from each item’s enabled flag', () => {
    render(<ModalityToggleList items={items} onSave={vi.fn()} />);

    expect(screen.getByRole('switch', { name: /standard/i })).toBeChecked();
    expect(screen.getByRole('switch', { name: /express/i })).not.toBeChecked();
  });

  it('toggling a switch stages the change without calling onSave', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ModalityToggleList items={items} onSave={onSave} />);

    await user.click(screen.getByRole('switch', { name: /express/i }));

    expect(screen.getByRole('switch', { name: /express/i })).toBeChecked();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('Save changes submits the full staged set, not just the diff', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ModalityToggleList items={items} onSave={onSave} />);

    await user.click(screen.getByRole('switch', { name: /express/i }));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledWith(['modality-1', 'modality-2']);
  });

  it('unchecking removes the id from the saved set', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ModalityToggleList items={items} onSave={onSave} />);

    await user.click(screen.getByRole('switch', { name: /standard/i }));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledWith([]);
  });

  it('readOnly disables every switch and hides the Save button', () => {
    render(<ModalityToggleList items={items} onSave={vi.fn()} readOnly />);

    expect(screen.getByRole('switch', { name: /standard/i })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /save changes/i })).toBeNull();
  });

  it('shows a working label and disables Save while saving', () => {
    render(<ModalityToggleList items={items} onSave={vi.fn()} isSaving />);

    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });
});
