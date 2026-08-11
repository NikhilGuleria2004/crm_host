import { ReactNode, useState, useEffect } from 'react';

interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export function Alert({ type = 'info', title, children, dismissible, onDismiss, className = '' }: AlertProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (dismissible) {
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss?.();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [dismissible, onDismiss]);

  if (!visible) return null;

  const styles = {
    info: 'border-accent bg-accent/10 text-accent',
    success: 'border-success bg-success/10 text-success',
    warning: 'border-warning bg-warning/10 text-warning',
    error: 'border-danger bg-danger/10 text-danger',
  };

  const icons: Record<string, string> = {
    info: 'ℹ️',
    success: '✓',
    warning: '⚠',
    error: '✕',
  };

  return (
    <div className={`rounded-md border p-4 ${styles[type]} ${className}`} role="alert">
      <div className="flex items-start gap-3">
        <span className="text-lg leading-none">{icons[type]}</span>
        <div className="flex-1">
          {title && <h3 className="text-sm font-medium mb-1">{title}</h3>}
          <div className="text-sm">{children}</div>
        </div>
        {dismissible && (
          <button
            onClick={() => {
              setVisible(false);
              onDismiss?.();
            }}
            className="text-current opacity-70 hover:opacity-100"
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
