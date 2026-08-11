import { ReactNode, useState, useRef, useEffect } from 'react';

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export function Dropdown({ trigger, children, align = 'right', className = '' }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={ref}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div
          className={`absolute z-50 mt-2 w-56 bg-white border border-border rounded shadow-lg ${align === 'right' ? 'right-0' : 'left-0'}`}
          role="menu"
        >
          <div className="py-1">{children}</div>
        </div>
      )}
    </div>
  );
}

interface DropdownItemProps {
  children: ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export function DropdownItem({ children, onClick, destructive, disabled }: DropdownItemProps) {
  return (
    <button
      role="menuitem"
      disabled={disabled}
      onClick={() => {
        onClick?.();
      }}
      className={`block w-full text-left px-4 py-2 text-sm disabled:cursor-not-allowed ${
        destructive ? 'text-danger hover:bg-danger/10' : 'text-foreground hover:bg-muted/50'
      }`}
    >
      {children}
    </button>
  );
}

interface DropdownDividerProps {}

export function DropdownDivider({}: DropdownDividerProps) {
  return <hr className="my-1 border-border" />;
}
