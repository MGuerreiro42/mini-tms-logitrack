import { act, render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { PageTransition } from './page-transition';

vi.mock('next/navigation', () => ({ usePathname: vi.fn() }));

function renderAt(path: string) {
  vi.mocked(usePathname).mockReturnValue(path);
  return render(
    <main>
      <PageTransition>
        <h1>{path}</h1>
      </PageTransition>
    </main>,
  );
}

describe('PageTransition', () => {
  it('leaves focus alone on first render', () => {
    renderAt('/seller');

    expect(screen.getByRole('heading')).not.toHaveFocus();
  });

  it('focuses the new page heading after a link navigation', () => {
    const { rerender } = renderAt('/seller');

    vi.mocked(usePathname).mockReturnValue('/seller/shipments');
    rerender(
      <main>
        <PageTransition>
          <h1>/seller/shipments</h1>
        </PageTransition>
      </main>,
    );

    expect(screen.getByRole('heading')).toHaveFocus();
  });

  it('keeps browser focus handling on back/forward', () => {
    const { rerender } = renderAt('/seller/shipments');

    act(() => window.dispatchEvent(new PopStateEvent('popstate')));
    vi.mocked(usePathname).mockReturnValue('/seller');
    rerender(
      <main>
        <PageTransition>
          <h1>/seller</h1>
        </PageTransition>
      </main>,
    );

    expect(screen.getByRole('heading')).not.toHaveFocus();
  });
});
