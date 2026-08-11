import { ReactNode, useState } from 'react';

interface DataFilterProps {
  filters: Array<{
    key: string;
    label: string;
    type: 'text' | 'select' | 'date' | 'daterange';
    options?: Array<{ value: string; label: string }>;
  }>;
  values: Record<string, string>;
  onValuesChange: (values: Record<string, string>) => void;
  onReset?: () => void;
  className?: string;
}

export function DataFilter({ filters, values, onValuesChange, onReset, className = '' }: DataFilterProps) {
  const [expanded, setExpanded] = useState(false);

  const activeCount = filters.filter((f) => values[f.key] && values[f.key] !== '').length;

  const handleChange = (key: string, value: string) => {
    onValuesChange({ ...values, [key]: value });
  };

  return (
    <div className={`bg-white border border-border rounded ${className}`}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Filters</span>
          {activeCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
              {activeCount} active
            </span>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-primary hover:text-primary/80"
        >
          {expanded ? 'Hide' : 'Show'}
        </button>
      </div>
      {expanded && (
        <div className="px-4 py-3 border-t border-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filters.map((filter) => (
              <div key={filter.key}>
                <label className="block text-xs font-medium text-foreground mb-1.5 uppercase tracking-wide">
                  {filter.label}
                </label>
                {filter.type === 'select' && filter.options ? (
                  <select
                    value={values[filter.key] || ''}
                    onChange={(e) => handleChange(filter.key, e.target.value)}
                    className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All</option>
                    {filter.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={filter.type}
                    value={values[filter.key] || ''}
                    onChange={(e) => handleChange(filter.key, e.target.value)}
                    className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              </div>
            ))}
          </div>
          {activeCount > 0 && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={onReset}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
