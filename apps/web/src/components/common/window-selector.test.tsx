import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useStatsWindow } from '@/hooks/use-stats-window';
import { currentUrl, resetNavigation, router } from '@/test/navigation';
import { WindowSelector } from './window-selector';

function Page() {
  const [statsWindow, setStatsWindow] = useStatsWindow();
  return <WindowSelector value={statsWindow} onChange={setStatsWindow} />;
}

describe('WindowSelector', () => {
  it('selects 30 d by default and writes another window with replace', async () => {
    resetNavigation('/carrier/performance');
    const user = userEvent.setup();
    render(<Page />);

    expect(
      screen.getByRole('radiogroup', { name: 'Time window' }),
    ).toBeVisible();
    expect(screen.getByRole('radio', { name: '30 d' })).toBeChecked();

    await user.click(screen.getByRole('radio', { name: '7 d' }));

    expect(currentUrl()).toBe('/carrier/performance?window=7d');
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByRole('radio', { name: '7 d' })).toBeChecked();
  });

  it('omits the default from the URL and drops an invalid window', async () => {
    resetNavigation('/carrier/performance?window=1y&tab=x');
    const user = userEvent.setup();
    render(<Page />);

    expect(screen.getByRole('radio', { name: '30 d' })).toBeChecked();
    await waitFor(() =>
      expect(currentUrl()).toBe('/carrier/performance?tab=x'),
    );

    await user.click(screen.getByRole('radio', { name: '90 d' }));
    await user.click(screen.getByRole('radio', { name: '30 d' }));

    expect(currentUrl()).toBe('/carrier/performance?tab=x');
  });
});
