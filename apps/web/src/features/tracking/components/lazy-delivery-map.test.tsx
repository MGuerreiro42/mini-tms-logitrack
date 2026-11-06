import { act, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import type { DeliveryMapProps, LastPosition } from '../types';
import type { DeliveryCanvasProps } from './delivery-map';
import { LazyDeliveryMap } from './lazy-delivery-map';

vi.mock('./delivery-map', () => ({
  default: (props: DeliveryCanvasProps) => (
    <div data-testid="canvas" data-props={JSON.stringify(props)} />
  ),
}));

const T0 = Date.UTC(2026, 0, 1);

const at = (lng: number, seconds: number): LastPosition => ({
  lat: -23.5,
  lng,
  heading: null,
  recordedAt: new Date(T0 + seconds * 1000).toISOString(),
});

function props(overrides: Partial<DeliveryMapProps> = {}): DeliveryMapProps {
  return {
    route: [
      [-46.9, -23.3],
      [-46.7, -23.5],
    ],
    stage: 'IN_TRANSIT',
    position: at(-46.8, 0),
    label: 'Delivery route',
    caption: 'On the way to São Paulo',
    ...overrides,
  } as DeliveryMapProps;
}

async function canvas(): Promise<DeliveryCanvasProps> {
  return JSON.parse((await screen.findByTestId('canvas')).dataset.props ?? '');
}

const figure = () => screen.getByRole('figure');

describe('LazyDeliveryMap', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('names the figure by its caption and points the canvas at it', async () => {
    render(<LazyDeliveryMap {...props()} />);

    const { captionId } = await canvas();
    expect(
      screen.getByRole('figure', { name: /^On the way to São Paulo/ }),
    ).toBeInTheDocument();
    expect(document.getElementById(captionId)?.tagName).toBe('FIGCAPTION');
    expect(figure().closest('[aria-live]')).toBeNull();
  });

  it("waits for the vehicle's signal without a position", async () => {
    render(<LazyDeliveryMap {...props({ position: null })} />);
    await canvas();

    expect(figure()).toHaveTextContent(
      "On the way to São Paulo · Waiting for the vehicle's signal",
    );
  });

  it('does not wait for a vehicle the public link never shows', async () => {
    render(
      <LazyDeliveryMap
        {...props({
          stage: 'OUT_FOR_DELIVERY',
          position: null,
          area: { center: [-46.63, -23.55] },
          caption: 'Out for delivery in São Paulo',
        })}
      />,
    );
    await canvas();

    expect(figure()).toHaveTextContent(/^Out for delivery in São Paulo$/);
  });

  it('never hands the canvas a position older than one it has shown', async () => {
    const { rerender } = render(
      <LazyDeliveryMap {...props({ position: at(-46.7, 4) })} />,
    );
    await canvas();

    rerender(<LazyDeliveryMap {...props({ position: at(-46.9, 2) })} />);

    expect((await canvas()).position).toEqual(at(-46.7, 4));
  });

  describe('signal age', () => {
    beforeEach(() => {
      vi.useFakeTimers({
        now: T0,
        toFake: ['Date', 'setInterval', 'clearInterval'],
      });
    });

    it('says how old the signal is after 10 s and greys it after 30 s', async () => {
      render(<LazyDeliveryMap {...props()} />);
      expect((await canvas()).stale).toBe(false);
      expect(figure()).not.toHaveTextContent('Last signal');

      act(() => vi.advanceTimersByTime(15_000));
      expect(figure()).toHaveTextContent('Last signal 15 s ago');
      expect((await canvas()).stale).toBe(false);

      act(() => vi.advanceTimersByTime(20_000));
      expect((await canvas()).stale).toBe(true);

      act(() => vi.advanceTimersByTime(60_000));
      expect(figure()).toHaveTextContent('Last signal 2 min ago');
    });

    it('leaves the age out of the server render so hydration matches', async () => {
      vi.setSystemTime(T0 + 21_000);

      expect(renderToString(<LazyDeliveryMap {...props()} />)).not.toContain(
        'Last signal',
      );
      render(<LazyDeliveryMap {...props()} />);
      await canvas();
      expect(figure()).toHaveTextContent('Last signal 21 s ago');
    });

    it('counts a ping from when it arrived, not from a skewed device clock', async () => {
      const { rerender } = render(<LazyDeliveryMap {...props()} />);
      await canvas();
      act(() => vi.advanceTimersByTime(300_000));

      // Recorded "1 s" after the first one by a device running 5 min behind.
      rerender(<LazyDeliveryMap {...props({ position: at(-46.7, 1) })} />);
      act(() => vi.advanceTimersByTime(5_000));

      expect(figure()).not.toHaveTextContent('Last signal');
      expect((await canvas()).stale).toBe(false);
    });
  });
});
