import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { CopyText } from './copy-field';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('CopyText', () => {
  beforeEach(() => {
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
  });

  it('shows the display text and copies the real value', async () => {
    const user = userEvent.setup();
    render(
      <CopyText
        value="41927305000162"
        display="41.927.305/0001-62"
        label="Copy tax ID"
      />,
    );

    expect(screen.getByText('41.927.305/0001-62')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Copy tax ID' }));

    expect(await navigator.clipboard.readText()).toBe('41927305000162');
    expect(toast.success).toHaveBeenCalledWith('Copied');
  });

  it('says so when the clipboard refuses', async () => {
    const user = userEvent.setup();
    render(<CopyText value="a@b.dev" label="Copy e-mail" />);
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(
      new Error('denied'),
    );

    await user.click(screen.getByRole('button', { name: 'Copy e-mail' }));

    expect(toast.error).toHaveBeenCalledWith("Couldn't copy");
    expect(toast.success).not.toHaveBeenCalled();
  });
});
