import { ReactNode, useState, useEffect, useRef } from 'react';

interface CommandMenuProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function CommandMenu({ open, onClose, children }: CommandMenuProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative mx-auto mt-24 w-full max-w-xl bg-white border border-border rounded-lg shadow-xl">
        <div className="flex items-center border-b border-border px-4">
          <span className="text-muted-foreground mr-2">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="h-12 w-full bg-transparent text-sm outline-none"
            placeholder="Type a command or search..."
          />
        </div>
        <div className="max-h-96 overflow-auto p-2">{children}</div>
      </div>
    </div>
  );
}

interface CommandGroupProps {
  heading?: string;
  children: ReactNode;
}

export function CommandGroup({ heading, children }: CommandGroupProps) {
  return (
    <div className="py-2">
      {heading && (
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {heading}
        </div>
      )}
      <div className="space-y-1">{children}</div>
    </div>
  );
}

interface CommandItemProps {
  children: ReactNode;
  onSelect?: () => void;
  shortcut?: string;
  destructive?: boolean;
}

export function CommandItem({ children, onSelect, shortcut, destructive }: CommandItemProps) {
  return (
    <button
      onClick={() => {
        onSelect?.();
      }}
      className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded hover:bg-muted/50 ${
        destructive ? 'text-danger hover:text-danger' : 'text-foreground'
      }`}
    >
      <span>{children}</span>
      {shortcut && <span className="text-xs text-muted-foreground">{shortcut}</span>}
    </button>
  );
}
