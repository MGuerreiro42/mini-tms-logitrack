import { act, renderHook } from '@testing-library/react';
import { useUiStore } from './ui-store';

describe('useUiStore', () => {
  beforeEach(() => {
    useUiStore.setState({ sidebarOpen: true });
  });

  it('starts with the sidebar open', () => {
    const { result } = renderHook(() => useUiStore());

    expect(result.current.sidebarOpen).toBe(true);
  });

  it('toggleSidebar flips the open state', () => {
    const { result } = renderHook(() => useUiStore());

    act(() => result.current.toggleSidebar());
    expect(result.current.sidebarOpen).toBe(false);

    act(() => result.current.toggleSidebar());
    expect(result.current.sidebarOpen).toBe(true);
  });
});
