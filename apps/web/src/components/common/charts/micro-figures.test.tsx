import { render } from '@testing-library/react';
import {
  MiniColumns,
  RateDots,
  SegmentBar,
  SpanBar,
  TickTrack,
} from './micro-figures';

const lefts = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>('[style]')].map(
    (node) => node.style.left || node.style.width || node.style.height,
  );

describe('micro figures', () => {
  it('drops empty segments and sizes the rest by value', () => {
    const { container } = render(
      <SegmentBar
        segments={[
          { key: 'a', value: 3, className: 'text-primary' },
          { key: 'b', value: 0, className: 'text-primary' },
          { key: 'c', value: 1, className: 'text-primary' },
        ]}
      />,
    );

    const segments = container.querySelectorAll<HTMLElement>('[style]');
    expect([...segments].map((node) => node.style.flexGrow)).toEqual([
      '3',
      '1',
    ]);
  });

  it('pins ticks past the track to its end', () => {
    const { container } = render(<TickTrack values={[6, 30]} max={12} />);

    expect(lefts(container)).toEqual(['50%', '100%']);
  });

  it('places the target, the previous and the current rate on a 50–100 track', () => {
    const { container } = render(
      <RateDots rate={90} previous={75} target={90} />,
    );

    expect(lefts(container)).toEqual(['80%', '50%', '80%']);
  });

  it('marks a rate below the floor with a chevron instead of a dot at the edge', () => {
    const { container } = render(
      <RateDots rate={30} previous={60} target={90} />,
    );

    expect(container.querySelectorAll('[data-below-min]')).toHaveLength(1);
    expect(lefts(container)).toEqual(['80%', '20%']);
  });

  it('scales columns to the tallest', () => {
    const { container } = render(<MiniColumns values={[5, 10]} />);

    expect(lefts(container)).toEqual(['50%', '100%']);
  });

  it('draws the tail, the typical value and the limit on one scale', () => {
    const { container } = render(<SpanBar from={22} to={55} limit={50} />);

    expect(
      lefts(container).map((left) => Math.round(Number.parseFloat(left))),
    ).toEqual([91, 36, 83]);
  });
});
