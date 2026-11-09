import { act, fireEvent, render, screen } from '@testing-library/react';
import { SearchField } from './search-field';

describe('SearchField', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const setup = (value = '') => {
    const onChange = vi.fn();
    const view = render(
      <SearchField value={value} onChange={onChange} placeholder="Code" />,
    );
    return { onChange, view, input: screen.getByRole('searchbox') };
  };

  it('writes the trimmed text once typing pauses for 300 ms', () => {
    const { onChange, input } = setup();

    fireEvent.change(input, { target: { value: ' TMS' } });
    act(() => vi.advanceTimersByTime(299));
    fireEvent.change(input, { target: { value: ' TMS-DE ' } });
    act(() => vi.advanceTimersByTime(299));
    expect(onChange).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(onChange).toHaveBeenCalledExactlyOnceWith('TMS-DE');
  });

  it('clears at once and follows the URL when it changes elsewhere', () => {
    const { onChange, input, view } = setup('campinas');

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(onChange).toHaveBeenCalledWith('');

    view.rerender(
      <SearchField value="13070" onChange={onChange} placeholder="Code" />,
    );
    expect(input).toHaveValue('13070');
  });

  it('keeps typing when the URL echoes what it just wrote', () => {
    const { onChange, input, view } = setup();

    fireEvent.change(input, { target: { value: 'camp' } });
    act(() => vi.advanceTimersByTime(300));
    fireEvent.change(input, { target: { value: 'campi' } });
    view.rerender(
      <SearchField value="camp" onChange={onChange} placeholder="Code" />,
    );

    expect(input).toHaveValue('campi');
    act(() => vi.advanceTimersByTime(300));
    expect(onChange).toHaveBeenLastCalledWith('campi');
  });

  it('writes at once on Enter', () => {
    const { onChange, input } = setup();

    fireEvent.change(input, { target: { value: 'TMS-DE' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledExactlyOnceWith('TMS-DE');
    act(() => vi.advanceTimersByTime(300));
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('leaves "/" alone with a modifier or inside a dialog', () => {
    const { input } = setup();
    const dialog = document.body.appendChild(document.createElement('div'));
    dialog.setAttribute('role', 'dialog');
    const button = dialog.appendChild(document.createElement('button'));

    fireEvent.keyDown(window, { key: '/', ctrlKey: true });
    expect(input).not.toHaveFocus();
    button.focus();
    fireEvent.keyDown(button, { key: '/' });
    expect(button).toHaveFocus();
    dialog.remove();
  });

  it('focuses on "/" unless another field is being typed in', () => {
    const { input } = setup();

    fireEvent.keyDown(window, { key: '/' });
    expect(input).toHaveFocus();

    input.blur();
    const other = document.body.appendChild(document.createElement('input'));
    other.focus();
    fireEvent.keyDown(other, { key: '/' });
    expect(other).toHaveFocus();
    other.remove();
  });
});
