interface ErrorStateProps {
  title?: string;
  message: string;
  action?: React.ReactNode;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  action,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{message}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
