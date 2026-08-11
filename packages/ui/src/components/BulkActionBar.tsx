import { Button } from './Button';
import { ConfirmDialog } from './ConfirmDialog';
import { ReactNode, useState } from 'react';

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  actions: Array<{
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    destructive?: boolean;
    confirm?: {
      title: string;
      description: string;
    };
  }>;
  className?: string;
}

export function BulkActionBar({ selectedCount, onClearSelection, actions, className = '' }: BulkActionBarProps) {
  const [confirmAction, setConfirmAction] = useState<{ label: string; description: string; onClick: () => void } | null>(null);

  if (selectedCount === 0) return null;

  return (
    <>
      <div className={`flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded ${className}`}>
        <span className="text-sm font-medium text-foreground">{selectedCount} selected</span>
        <div className="flex items-center gap-2">
          {actions.map((action, idx) => (
            <Button
              key={idx}
              variant={action.destructive ? 'destructive' : 'secondary'}
              size="sm"
              onClick={() => {
                if (action.confirm) {
                  setConfirmAction({
                    label: action.label,
                    description: action.confirm.description,
                    onClick: action.onClick,
                  });
                } else {
                  action.onClick();
                }
              }}
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
          <Button variant="ghost" size="sm" onClick={onClearSelection}>
            Clear
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          confirmAction?.onClick();
          setConfirmAction(null);
        }}
        title={confirmAction?.label || ''}
        description={confirmAction?.description || ''}
        destructive={actions.find((a) => a.label === confirmAction?.label)?.destructive}
      />
    </>
  );
}
