export function LoadingState({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-12 bg-muted/50 rounded animate-pulse"
        />
      ))}
    </div>
  );
}
