// A rate's change in muted ink: "better" flips sign between metrics, so never green or red.
export function DeltaText({
  points,
  previous,
}: {
  points: number;
  previous: number;
}) {
  const change = Number(points.toFixed(1));
  if (change === 0) {
    return (
      <span className="whitespace-nowrap">
        no change
        <span className="sr-only">{` from ${previous.toFixed(1)}%`}</span>
      </span>
    );
  }
  return (
    <span className="whitespace-nowrap">
      <span aria-hidden>{change < 0 ? '▼' : '▲'}</span>{' '}
      {Math.abs(change).toFixed(1)} pts
      <span className="sr-only">
        {` ${change < 0 ? 'down' : 'up'} from ${previous.toFixed(1)}%`}
      </span>
    </span>
  );
}
