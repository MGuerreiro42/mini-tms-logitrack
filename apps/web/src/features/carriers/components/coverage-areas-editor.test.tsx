import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CoverageArea } from '../types';
import { CoverageAreasEditor } from './coverage-areas-editor';

const initialAreas: CoverageArea[] = [
  { id: 'area-1', state: 'SP', city: 'São Paulo' },
  { id: 'area-2', state: 'RJ', city: null },
];

describe('CoverageAreasEditor — readOnly mode', () => {
  it('renders a chip per area, "All of <state>" for a null city', () => {
    render(
      <CoverageAreasEditor
        initialAreas={initialAreas}
        onSave={vi.fn()}
        readOnly
      />,
    );

    expect(screen.getByText('São Paulo/SP')).toBeInTheDocument();
    expect(screen.getByText('All of RJ')).toBeInTheDocument();
  });

  it('shows a placeholder message when there are no areas', () => {
    render(<CoverageAreasEditor initialAreas={[]} onSave={vi.fn()} readOnly />);

    expect(
      screen.getByText('No coverage areas configured yet.'),
    ).toBeInTheDocument();
  });
});

describe('CoverageAreasEditor — edit mode', () => {
  it('seeds one row per initial area', () => {
    render(
      <CoverageAreasEditor initialAreas={initialAreas} onSave={vi.fn()} />,
    );

    expect(
      screen.getAllByRole('button', { name: /^Remove area/ }),
    ).toHaveLength(2);
    expect(screen.getAllByLabelText('City')[0]).toHaveValue('São Paulo');
  });

  it('shows the warning when there are no rows left', async () => {
    const user = userEvent.setup();
    render(
      <CoverageAreasEditor initialAreas={initialAreas} onSave={vi.fn()} />,
    );

    for (const button of screen.getAllByRole('button', {
      name: /^Remove area/,
    })) {
      await user.click(button);
    }

    expect(screen.getByText(/won't find your company/i)).toBeInTheDocument();
  });

  it('Add area appends a new empty row', async () => {
    const user = userEvent.setup();
    render(<CoverageAreasEditor initialAreas={[]} onSave={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Add area' }));

    expect(
      screen.getAllByRole('button', { name: /^Remove area/ }),
    ).toHaveLength(1);
  });

  it('submits with an empty city mapped to undefined and a filled one trimmed', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<CoverageAreasEditor initialAreas={initialAreas} onSave={onSave} />);

    const cityInputs = screen.getAllByLabelText('City');
    await user.clear(cityInputs[0]);
    await user.type(cityInputs[0], '  Campinas  ');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledWith([
      { state: 'SP', city: 'Campinas' },
      { state: 'RJ', city: undefined },
    ]);
  });

  it('flags a duplicated area below its city field and does not save', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<CoverageAreasEditor initialAreas={initialAreas} onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: 'Add area' }));
    await user.type(screen.getAllByLabelText('City')[2], 'são paulo');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    const duplicate = screen.getAllByLabelText('City')[2];
    expect(duplicate).toHaveAccessibleDescription(
      'This area is already listed.',
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows a working label and disables Save while saving', () => {
    render(
      <CoverageAreasEditor
        initialAreas={initialAreas}
        onSave={vi.fn()}
        isSaving
      />,
    );

    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });
});
