import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { usePeek } from '@/hooks/use-peek';
import { currentUrl, resetNavigation, router } from '@/test/navigation';
import { setViewportWidth } from '@/test/viewport';
import { PeekSheet } from './peek-sheet';

const ROWS = ['a', 'b', 'c'];

function Harness() {
  const peek = usePeek(ROWS);
  const [typed, setTyped] = useState('');
  return (
    <>
      <input
        aria-label="Search"
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
      />
      <table>
        <tbody>
          {ROWS.map((id) => (
            <tr key={id} data-row-key={id}>
              <td>
                <a href={`/s/${id}`}>{id}</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={() => peek.open('a')}>
        Peek a
      </button>
      {peek.peekId && (
        <PeekSheet peek={peek} label={`${peek.peekId} preview`} href="/full">
          {peek.peekId}
        </PeekSheet>
      )}
    </>
  );
}

const press = (key: string, target: Element = document.body) =>
  fireEvent.keyDown(target, { key });

describe('PeekSheet', () => {
  beforeEach(() => resetNavigation('/s?view=active'));

  it('opens with a push, focuses the sheet and moves with J/K inside the page', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Peek a' }));

    expect(router.push).toHaveBeenCalledWith('/s?view=active&peek=a', {
      scroll: false,
    });
    expect(screen.getByRole('dialog', { name: 'a preview' })).toHaveFocus();

    press('k');
    expect(currentUrl()).toBe('/s?view=active&peek=a');
    // Back to back, before the URL catches up.
    vi.mocked(router.replace)
      .mockImplementationOnce(() => {})
      .mockImplementationOnce(() => {});
    press('j');
    press('J');
    expect(router.replace).toHaveBeenLastCalledWith('/s?view=active&peek=c', {
      scroll: false,
    });
    expect(currentUrl()).toBe('/s?view=active&peek=a');
  });

  it('announces the row J moves to and closes back over its own history entry', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Peek a' }));
    press('j');

    expect(
      screen.getByText('b preview', { selector: '[aria-live]' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close preview' }));

    expect(router.back).toHaveBeenCalledOnce();
    expect(currentUrl()).toBe('/s?view=active');
    expect(screen.getByRole('link', { name: 'b' })).toHaveFocus();
  });

  it('ignores J/K while typing, opens the page on Enter and closes on Esc back to the row', () => {
    resetNavigation('/s?peek=b');
    render(<Harness />);

    press('j', screen.getByRole('textbox', { name: 'Search' }));
    expect(currentUrl()).toBe('/s?peek=b');

    press('Enter', screen.getByRole('button', { name: 'Close preview' }));
    expect(router.push).not.toHaveBeenCalled();
    vi.mocked(router.push).mockImplementationOnce(() => {});
    press('Enter', screen.getByRole('dialog'));
    expect(router.push).toHaveBeenCalledWith('/full');

    press('Escape', screen.getByRole('textbox', { name: 'Search' }));
    expect(screen.getByRole('dialog')).toBeVisible();
    press('Escape');
    expect(router.back).not.toHaveBeenCalled();
    expect(currentUrl()).toBe('/s');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('link', { name: 'b' })).toHaveFocus();
  });

  it('does not exist below 768 px', () => {
    setViewportWidth(390);
    resetNavigation('/s?peek=b');
    render(<Harness />);

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
