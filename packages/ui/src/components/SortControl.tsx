import { ReactNode } from 'react';
import { Button } from './Button';

interface SortControlProps {
  sortKey: string;
  sortDirection: 'asc' | 'desc' | null;
  onSort: (key: string) => void;
  children: ReactNode;
  className?: string;
}

export function SortControl({ sortKey, sortDirection, onSort, children, className = '' }: SortControlProps) {
  const isActive = sortDirection !== null;
  const icon = sortDirection === 'asc' ? '↑' : sortDirection === 'desc' ? '↓' : '↕';

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onSort(sortKey)}
      className={`gap-1 ${className}`}
    >
      {children}
      <span className={`text-xs ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{icon}</span>
    </Button>
  );
}
