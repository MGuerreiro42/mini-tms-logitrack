import { act, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { setReducedMotion } from '@/test/viewport';
import type { LastPosition, LngLat } from '../types';
import DeliveryMap, { type DeliveryCanvasProps } from './delivery-map';

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
    canvas = document.createElement('canvas');
    on = vi.fn((event: string, cb: Handler) => {
      this.handlers[event] = [...(this.handlers[event] ?? []), cb];
      return this;
    });
    once = this.on;
    addSource = vi.fn((id: string) => {
      this.sources.set(id, { setData: vi.fn() });
    });
    getSource = vi.fn((id: string) => this.sources.get(id));
    getCanvas = () => this.canvas;
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

const base = {
  route,
  stage: 'IN_TRANSIT',
  position: at(-46.9, -23.3, 0),
  label: 'Delivery route',
  caption: 'On the way',
  stale: false,
  captionId: 'caption-1',
} as const;

function internal(
  overrides: Partial<DeliveryCanvasProps> = {},
): DeliveryCanvasProps {
  return {
    ...base,
    splitIndex: 2,
    destination: [-46.55, -23.62],
    ...overrides,
  } as DeliveryCanvasProps;
}

function publicMap(
  overrides: Partial<DeliveryCanvasProps> = {},
): DeliveryCanvasProps {
  return {
    ...base,
    area: { center: [-46.63, -23.55] },
    ...overrides,
  } as DeliveryCanvasProps;
}

const map = () => fake.state.maps[0];
const vehicle = () => fake.state.markers.at(-1);
const tileError = {
  error: new Error('tile 404'),
  sourceId: 'openmaptiles',
  tile: {},
};

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

  it('names the canvas and points it at the caption, with tamed gestures', () => {
    render(<DeliveryMap {...internal()} />);

    expect(map().options).toMatchObject({
      cooperativeGestures: true,
      dragRotate: false,
      touchPitch: false,
      locale: { 'Map.Title': 'Delivery route' },
    });
    expect(map().canvas).toHaveAttribute('aria-describedby', 'caption-1');
    expect(map().touchZoomRotate.disableRotation).toHaveBeenCalled();
  });

  it('collapses the attribution once loaded', () => {
    render(<DeliveryMap {...internal()} />);
    const attribution = document.createElement('details');
    attribution.className = 'maplibregl-ctrl-attrib maplibregl-compact-show';
    (map().options.container as HTMLElement).append(attribution);

    act(() => map().fire('load'));

    expect(attribution).not.toHaveClass('maplibregl-compact-show');
  });

  it('picks the style by theme and re-adds the route after a switch', () => {
    const { rerender } = render(<DeliveryMap {...internal()} />);
    expect(map().options.style).toBe(
      'https://tiles.openfreemap.org/styles/positron',
    );
    act(() => map().fire('style.load'));
    expect(map().addLayer).toHaveBeenCalledTimes(2);

    fake.state.theme = 'dark';
    rerender(<DeliveryMap {...internal()} />);
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

  it('updates the traveled line when the vehicle passes another vertex', () => {
    setReducedMotion(true);
    const { rerender } = render(<DeliveryMap {...internal()} />);
    act(() => map().fire('style.load'));
    const source = map().sources.get('route');

    rerender(<DeliveryMap {...internal({ position: at(-46.7, -23.5, 2) })} />);

    const data = source?.setData.mock.lastCall?.[0];
    expect(data.features).toEqual([
      expect.objectContaining({
        properties: { part: 'remaining' },
        geometry: expect.objectContaining({ coordinates: route.slice(2) }),
      }),
      expect.objectContaining({
        properties: { part: 'traveled' },
        geometry: expect.objectContaining({ coordinates: route.slice(0, 3) }),
      }),
    ]);
  });

  it('jumps straight to each position under reduced motion', () => {
    setReducedMotion(true);
    const { rerender } = render(<DeliveryMap {...internal()} />);

    rerender(<DeliveryMap {...internal({ position: at(-46.8, -23.4, 2) })} />);

    expect(vehicle()?.lngLat).toEqual([-46.8, -23.4]);
  });

  describe('gliding', () => {
    beforeEach(() => {
      vi.useFakeTimers({
        toFake: [
          'requestAnimationFrame',
          'cancelAnimationFrame',
          'performance',
        ],
      });
    });

    it('glides between pings over 2 s and turns toward the new point', () => {
      const { rerender } = render(
        <DeliveryMap {...internal({ position: at(0, 0, 0) })} />,
      );

      rerender(<DeliveryMap {...internal({ position: at(1, 0, 2) })} />);
      act(() => vi.advanceTimersByTime(1000));
      const [lng] = vehicle()?.lngLat ?? [];
      expect(lng).toBeCloseTo(0.5, 1);
      expect(vehicle()?.rotation).toBeCloseTo(45, 0);

      act(() => vi.advanceTimersByTime(1100));
      expect(vehicle()?.lngLat).toEqual([1, 0]);
      expect(vehicle()?.rotation).toBeCloseTo(90);
    });

    it('restarts a mid-glide ping from where the marker is', () => {
      const cancel = vi.spyOn(window, 'cancelAnimationFrame');
      const { rerender } = render(
        <DeliveryMap {...internal({ position: at(0, 0, 0) })} />,
      );
      rerender(<DeliveryMap {...internal({ position: at(1, 0, 2) })} />);
      act(() => vi.advanceTimersByTime(1000));
      cancel.mockClear();

      rerender(<DeliveryMap {...internal({ position: at(1, 1, 4) })} />);
      expect(cancel).toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(1000));

      const [lng, lat] = vehicle()?.lngLat ?? [];
      expect(lng).toBeCloseTo(0.75, 1);
      expect(lat).toBeCloseTo(0.5, 1);
    });
  });

  it('removes the vehicle when the position goes away', () => {
    const { rerender } = render(<DeliveryMap {...internal()} />);
    const marker = vehicle();

    rerender(<DeliveryMap {...internal({ stage: 'DONE', position: null })} />);

    expect(marker?.remove).toHaveBeenCalled();
  });

  it('greys a stale marker through its data attribute', () => {
    const { rerender } = render(<DeliveryMap {...internal()} />);
    expect(vehicle()?.getElement()).toHaveAttribute('data-stale', 'false');

    rerender(<DeliveryMap {...internal({ stale: true })} />);

    expect(vehicle()?.getElement()).toHaveAttribute('data-stale', 'true');
  });

  it('shows the fallback when WebGL2 is unavailable', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fake.state.failWith = Object.assign(new Error('no WebGL2'), {
      name: 'GPUInitializationError',
    });

    render(<DeliveryMap {...internal()} />);

    expect(screen.getByText(/Map unavailable/)).toBeInTheDocument();
  });

  it('falls back and removes the map when the style fails before load', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<DeliveryMap {...internal()} />);

    act(() => map().fire('error', { error: new Error('style 503') }));

    expect(screen.getByText(/Map unavailable/)).toBeInTheDocument();
    expect(map().remove).toHaveBeenCalledTimes(1);
  });

  it('keeps the map on a tile error before load', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<DeliveryMap {...internal()} />);

    act(() => map().fire('error', tileError));

    expect(screen.queryByText(/Map unavailable/)).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it('only logs an error after load', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<DeliveryMap {...internal()} />);

    act(() => map().fire('load'));
    act(() => map().fire('error', { error: new Error('style 503') }));

    expect(screen.queryByText(/Map unavailable/)).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it('frames the route on mount and on a stage change, not on pings', () => {
    setReducedMotion(true);
    const { rerender } = render(<DeliveryMap {...internal()} />);
    expect(map().fitBounds).toHaveBeenCalledTimes(1);

    rerender(<DeliveryMap {...internal({ position: at(-46.8, -23.4, 2) })} />);
    expect(map().fitBounds).toHaveBeenCalledTimes(1);

    rerender(
      <DeliveryMap
        {...internal({
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
      expect.objectContaining({ animate: false, maxZoom: 15 }),
    );
  });

  it('reframes on resize until the user moves the map', () => {
    render(<DeliveryMap {...internal()} />);

    act(() => map().fire('resize'));
    expect(map().fitBounds).toHaveBeenCalledTimes(2);

    act(() =>
      map().fire('movestart', { originalEvent: new MouseEvent('mousedown') }),
    );
    act(() => map().fire('resize'));
    expect(map().fitBounds).toHaveBeenCalledTimes(2);
  });

  it('draws the public city as a halo layer and caps the zoom', () => {
    render(<DeliveryMap {...publicMap()} />);
    act(() => map().fire('style.load'));

    expect(map().addLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'area-halo', type: 'circle' }),
    );
    expect(map().fitBounds).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ maxZoom: 12 }),
    );
    expect(fake.state.markers).toHaveLength(1);
  });

  it('centres the public map on the city out for delivery', () => {
    render(
      <DeliveryMap
        {...publicMap({ stage: 'OUT_FOR_DELIVERY', position: null })}
      />,
    );

    expect(map().easeTo).toHaveBeenCalledWith(
      expect.objectContaining({ center: [-46.63, -23.55], zoom: 11 }),
    );
    expect(map().fitBounds).not.toHaveBeenCalled();
  });

  it('keeps one live map under StrictMode, ignoring the disposed one', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <StrictMode>
        <DeliveryMap {...internal()} />
      </StrictMode>,
    );
    const [disposed, live] = fake.state.maps;

    expect(disposed.remove).toHaveBeenCalledTimes(1);
    expect(live.remove).not.toHaveBeenCalled();
    act(() => disposed.fire('error', { error: new Error('late') }));
    expect(screen.queryByText(/Map unavailable/)).toBeNull();
  });

  it('removes the map on unmount', () => {
    const { unmount } = render(<DeliveryMap {...internal()} />);

    unmount();

    expect(map().remove).toHaveBeenCalled();
  });
});
