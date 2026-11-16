const WIDTH = 72;
const HEIGHT = 24;
// Inset so the 2 px line is not clipped at the top and bottom edges.
const PAD = 2;
const MIN_POINTS = 3;

interface SparklineProps {
  values: (number | null)[];
  target?: number;
}

// Decorative: the tile states the value and its popover the trend, so it is aria-hidden.
export function Sparkline({ values, target }: SparklineProps) {
  const points = values.flatMap((value, index) =>
    value === null ? [] : [{ index, value }],
  );
  if (points.length < MIN_POINTS) return null;

  const scale = points
    .map((point) => point.value)
    .concat(target === undefined ? [] : [target]);
  const min = Math.min(...scale);
  const span = Math.max(...scale) - min || 1;
  const x = (index: number) => (index / Math.max(values.length - 1, 1)) * WIDTH;
  const y = (value: number) =>
    PAD + (1 - (value - min) / span) * (HEIGHT - 2 * PAD);

  return (
    <svg
      aria-hidden
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="shrink-0 overflow-visible"
    >
      {target !== undefined && (
        <line
          x1={0}
          x2={WIDTH}
          y1={y(target)}
          y2={y(target)}
          className="stroke-muted-foreground"
          strokeWidth={1}
          strokeDasharray="2 2"
        />
      )}
      {/* Null buckets are skipped, so the line runs straight to the next point. */}
      <polyline
        points={points
          .map((point) => `${x(point.index)},${y(point.value)}`)
          .join(' ')}
        fill="none"
        className="stroke-chart-1"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
