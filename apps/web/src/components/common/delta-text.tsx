// A rate's change in muted ink: "better" flips sign between metrics, so never green or red.
export function DeltaText({
  points,
  previous,
}: {
  points: number;
  previous: number;
}) {
  return (
    <span className="whitespace-nowrap">
      <span aria-hidden>{points < 0 ? '▼' : '▲'}</span>{' '}
      {Math.abs(points).toFixed(1)} pts
      <span className="sr-only">
        {` ${points < 0 ? 'down' : 'up'} from ${previous.toFixed(1)}%`}
      </span>
    </span>
  );
}
