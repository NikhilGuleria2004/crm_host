import { useState } from 'react';
import { Input } from './Input';
import { Button } from './Button';

interface FilterControlProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  className?: string;
}

export function FilterControl({ placeholder = 'Filter...', value, onChange, onClear, className = '' }: FilterControlProps) {
  return (
    <div className={`relative ${className}`}>
      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">🔍</span>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-10"
      />
      {value && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="absolute inset-y-0 right-0 px-2"
        >
          ×
        </Button>
      )}
    </div>
  );
}
