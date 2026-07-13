export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // min-h-screen, not min-h-full — body only has min-h-full itself, which
    // isn't a definite height for a descendant's percentage-height to
    // resolve against, so this card was only ever as tall as its own
    // content instead of centering in the real viewport.
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-6">
      {children}
    </div>
  );
}
