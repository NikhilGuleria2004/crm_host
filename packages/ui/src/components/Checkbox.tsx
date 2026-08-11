import { forwardRef, InputHTMLAttributes } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, indeterminate, className = '', id, ...props }, ref) => {
    const checkboxId = id || props.name;

    return (
      <div className="flex items-start gap-3">
        <input
          ref={(el) => {
            if (el) {
              el.indeterminate = !!indeterminate;
              if (typeof ref === 'function') ref(el);
              else if (ref) ref.current = el;
            }
          }}
          type="checkbox"
          id={checkboxId}
          className={`h-4 w-4 mt-0.5 rounded border-border text-primary focus:ring-primary ${className}`}
          {...props}
        />
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <label htmlFor={checkboxId} className="text-sm font-medium text-foreground cursor-pointer">
                {label}
              </label>
            )}
            {description && <span className="text-xs text-muted-foreground">{description}</span>}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
