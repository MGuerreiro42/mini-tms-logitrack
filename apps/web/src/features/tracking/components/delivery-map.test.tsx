import { act, render, screen } from '@testing-library/react';
import { setReducedMotion } from '@/test/viewport';
import type { LastPosition, LngLat } from '../types';
import DeliveryMap, { type DeliveryMapProps } from './delivery-map';

type Handler = (payload?: unknown) => void;

const fake = vi.hoisted(() => {
  const state = {
    maps: [] as FakeMap[],
    markers: [] as FakeMarker[],
    theme: 'light',
    failWith: null as Error | null,
  };

  class FakeMap {
    handlers: Record<string, Handler[]> = {};
    sources = new Map<string, { setData: ReturnType<typeof vi.fn> }>();
    touchZoomRotate = { disableRotation: vi.fn() };
    on = vi.fn((event: string, cb: Handler) => {
      this.handlers[event] = [...(this.handlers[event] ?? []), cb];
      return this;
    });
    once = this.on;
    addSource = vi.fn((id: string) => {
      this.sources.set(id, { setData: vi.fn() });
    });
    getSource = vi.fn((id: string) => this.sources.get(id));
    addLayer = vi.fn();
    setStyle = vi.fn(() => this.sources.clear());
    fitBounds = vi.fn();
    easeTo = vi.fn();
    remove = vi.fn();

    constructor(public options: Record<string, unknown>) {
      if (state.failWith) throw state.failWith;
      state.maps.push(this);
    }

    fire(event: string, payload?: unknown) {
      for (const cb of this.handlers[event] ?? []) cb(payload);
    }
  }

  class FakeMarker {
    lngLat: LngLat | null = null;
    rotation = 0;
    setLngLat = vi.fn((at: LngLat) => {
      this.lngLat = at;
      return this;
    });
    setRotation = vi.fn((deg: number) => {
      this.rotation = deg;
      return this;
    });
    addTo = vi.fn(() => this);
    remove = vi.fn();

    constructor(public options: { element: HTMLElement }) {
      state.markers.push(this);
    }

    getElement() {
      return this.options.element;
    }
  }

  return { state, FakeMap, FakeMarker };
});

vi.mock('maplibre-gl', () => ({
  MapLibreMap: fake.FakeMap,
  Marker: fake.FakeMarker,
  setWorkerUrl: vi.fn(),
}));
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));
vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: fake.state.theme }),
}));

const route: LngLat[] = [
  [-46.9, -23.3],
  [-46.8, -23.4],
  [-46.7, -23.5],
  [-46.6, -23.6],
];

const at = (lng: number, lat: number, seconds: number): LastPosition => ({
  lat,
  lng,
  heading: null,
  recordedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, seconds)).toISOString(),
});

function props(overrides: Partial<DeliveryMapProps> = {}): DeliveryMapProps {
  return {
    route,
    splitIndex: 2,
    destination: [-46.55, -23.62],
    stage: 'IN_TRANSIT',
    position: at(-46.9, -23.3, 0),
    label: 'Live map',
    caption: 'On the way',
    ...overrides,
  };
}

const map = () => fake.state.maps[0];
const vehicle = () => fake.state.markers.at(-1);

describe('DeliveryMap', () => {
  beforeEach(() => {
    fake.state.maps = [];
    fake.state.markers = [];
    fake.state.theme = 'light';
    fake.state.failWith = null;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('is a named region with a visible caption', () => {
    render(<DeliveryMap {...props()} />);

    expect(screen.getByRole('region', { name: 'Live map' })).toHaveTextContent(
      'On the way',
    );
    expect(map().options).toMatchObject({
      cooperativeGestures: true,
      dragRotate: false,
      touchPitch: false,
    });
    expect(map().touchZoomRotate.disableRotation).toHaveBeenCalled();
  });

  it('picks the style by theme and re-adds the route after a switch', () => {
    const { rerender } = render(<DeliveryMap {...props()} />);
    expect(map().options.style).toBe(
      'https://tiles.openfreemap.org/styles/positron',
    );
    act(() => map().fire('style.load'));
    expect(map().addLayer).toHaveBeenCalledTimes(2);

    fake.state.theme = 'dark';
    rerender(<DeliveryMap {...props()} />);
    act(() => map().fire('style.load'));

    expect(map().setStyle).toHaveBeenCalledWith(
      'https://tiles.openfreemap.org/styles/dark',
    );
    expect(map().addLayer).toHaveBeenCalledTimes(4);
    expect(map().addLayer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: 'route-traveled',
        paint: expect.objectContaining({ 'line-color': '#6fb8a6' }),
      }),
    );
  });

  it('jumps straight to each position under reduced motion', () => {
    setReducedMotion(true);
    const { rerender } = render(<DeliveryMap {...props()} />);

    rerender(<DeliveryMap {...props({ position: at(-46.8, -23.4, 2) })} />);

    expect(vehicle()?.lngLat).toEqual([-46.8, -23.4]);
  });

  it('glides between pings over 2 s and turns toward the new point', () => {
    vi.useFakeTimers({
      toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
    });
    const { rerender } = render(
      <DeliveryMap {...props({ position: at(0, 0, 0) })} />,
    );

    rerender(<DeliveryMap {...props({ position: at(1, 0, 2) })} />);
    act(() => vi.advanceTimersByTime(1000));
    const [lng] = vehicle()?.lngLat ?? [];
    expect(lng).toBeCloseTo(0.5, 1);
    expect(vehicle()?.rotation).toBeCloseTo(45, 0);

    act(() => vi.advanceTimersByTime(1100));
    expect(vehicle()?.lngLat).toEqual([1, 0]);
    expect(vehicle()?.rotation).toBeCloseTo(90);
  });

  it('never moves the marker back for an older ping', () => {
    setReducedMotion(true);
    const { rerender } = render(
      <DeliveryMap {...props({ position: at(-46.8, -23.4, 4) })} />,
    );

    rerender(<DeliveryMap {...props({ position: at(-46.9, -23.3, 2) })} />);

    expect(vehicle()?.lngLat).toEqual([-46.8, -23.4]);
  });

  it('shows the fallback when WebGL2 is unavailable', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fake.state.failWith = Object.assign(new Error('no WebGL2'), {
      name: 'GPUInitializationError',
    });

    render(<DeliveryMap {...props()} />);

    expect(screen.getByText(/Map unavailable/)).toBeInTheDocument();
  });

  it('shows the fallback on an error before load, and only logs one after', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<DeliveryMap {...props()} />);

    act(() => map().fire('load'));
    act(() => map().fire('error', { error: new Error('tile 404') }));
    expect(screen.queryByText(/Map unavailable/)).not.toBeInTheDocument();
    expect(console.error).toHaveBeenCalled();
  });

  it('falls back when the style fails before the map loads', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<DeliveryMap {...props()} />);

    act(() => map().fire('error', { error: new Error('style 503') }));

    expect(screen.getByText(/Map unavailable/)).toBeInTheDocument();
  });

  it("waits for the vehicle's signal without a position", () => {
    render(<DeliveryMap {...props({ position: null })} />);

    expect(screen.getByRole('region')).toHaveTextContent(
      "On the way · Waiting for the vehicle's signal",
    );
  });

  it('flags a stale signal after 10 s and greys the marker after 30 s', () => {
    const position = at(-46.8, -23.4, 0);
    vi.useFakeTimers({
      now: Date.parse(position.recordedAt),
      toFake: ['Date', 'setInterval', 'clearInterval'],
    });
    render(<DeliveryMap {...props({ position })} />);
    expect(screen.getByRole('region')).not.toHaveTextContent('Last signal');

    act(() => vi.advanceTimersByTime(15_000));
    expect(screen.getByRole('region')).toHaveTextContent('Last signal 15s ago');
    expect(vehicle()?.getElement()).toHaveAttribute('data-stale', 'false');

    act(() => vi.advanceTimersByTime(20_000));
    expect(vehicle()?.getElement()).toHaveAttribute('data-stale', 'true');
  });

  it('frames the route on mount and on a stage change, not on pings', () => {
    setReducedMotion(true);
    const { rerender } = render(<DeliveryMap {...props()} />);
    expect(map().fitBounds).toHaveBeenCalledTimes(1);

    rerender(<DeliveryMap {...props({ position: at(-46.8, -23.4, 2) })} />);
    expect(map().fitBounds).toHaveBeenCalledTimes(1);

    rerender(
      <DeliveryMap
        {...props({
          stage: 'OUT_FOR_DELIVERY',
          position: at(-46.7, -23.5, 4),
        })}
      />,
    );
    expect(map().fitBounds).toHaveBeenCalledTimes(2);
    expect(map().fitBounds).toHaveBeenLastCalledWith(
      [
        [-46.7, -23.62],
        [-46.55, -23.5],
      ],
      expect.objectContaining({ animate: false }),
    );
  });

  it('removes the map on unmount', () => {
    const { unmount } = render(<DeliveryMap {...props()} />);

    unmount();

    expect(map().remove).toHaveBeenCalled();
  });
});
