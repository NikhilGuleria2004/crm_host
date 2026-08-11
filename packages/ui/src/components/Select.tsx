import { forwardRef } from 'react';

interface SelectProps {
  label?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, value, onValueChange, placeholder, options, disabled, error, className = '', ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-medium text-foreground mb-1.5 uppercase tracking-wide">
          {label}
        </label>
      )}
      <select
        ref={ref}
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        disabled={disabled}
        className={[
          'w-full h-10 px-3 text-sm border rounded bg-white',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
          'disabled:bg-muted disabled:cursor-not-allowed',
          error ? 'border-danger' : 'border-border',
          className,
        ].join(' ')}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  )
);

Select.displayName = 'Select';
