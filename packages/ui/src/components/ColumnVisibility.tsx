import { ReactNode, useState } from 'react';
import { Button } from './Button';
import { Dropdown, DropdownItem, DropdownDivider } from './Dropdown';

export interface ColumnDefinition {
  key: string;
  label: string;
  visible: boolean;
}

interface ColumnVisibilityProps {
  columns: ColumnDefinition[];
  onChange: (columns: ColumnDefinition[]) => void;
  trigger?: ReactNode;
  className?: string;
}

export function ColumnVisibility({ columns, onChange, trigger, className = '' }: ColumnVisibilityProps) {
  const [open, setOpen] = useState(false);

  const visibleCount = columns.filter((c) => c.visible).length;

  const toggle = (key: string) => {
    onChange(columns.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c)));
  };

  return (
    <Dropdown
      trigger={
        trigger || (
          <Button variant="secondary" size="sm">
            Columns ({visibleCount})
          </Button>
        )
      }
      align="right"
      className={className}
    >
      {columns.map((col) => (
        <DropdownItem key={col.key} onClick={() => toggle(col.key)}>
          <div className="flex items-center gap-2">
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center ${col.visible ? 'bg-primary border-primary' : 'border-border'}`}
            >
              {col.visible && <span className="text-white text-xs">✓</span>}
            </div>
            <span>{col.label}</span>
          </div>
        </DropdownItem>
      ))}
      <DropdownDivider />
      <DropdownItem onClick={() => onChange(columns.map((c) => ({ ...c, visible: true })))}>
        Show all
      </DropdownItem>
      <DropdownItem onClick={() => onChange(columns.map((c) => ({ ...c, visible: false })))}>
        Hide all
      </DropdownItem>
    </Dropdown>
  );
}
