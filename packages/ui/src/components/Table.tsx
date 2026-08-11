import { TableHTMLAttributes, forwardRef } from 'react';

interface TableProps extends TableHTMLAttributes<HTMLTableElement> {}

export const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div className="w-full overflow-auto border border-border rounded bg-white">
        <table
          ref={ref}
          className={`w-full text-sm text-left ${className}`}
          {...props}
        >
          {children}
        </table>
      </div>
    );
  }
);

Table.displayName = 'Table';

interface TableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function TableHeader({ children, className = '' }: TableHeaderProps) {
  return (
    <thead className={`bg-muted/50 border-b border-border ${className}`}>
      {children}
    </thead>
  );
}

interface TableBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function TableBody({ children, className = '' }: TableBodyProps) {
  return <tbody className={`divide-y divide-border ${className}`}>{children}</tbody>;
}

interface TableRowProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function TableRow({ children, className = '', onClick }: TableRowProps) {
  return (
    <tr
      className={`hover:bg-muted/30 transition-colors ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

interface TableCellProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export function TableCell({ children, className = '', align }: TableCellProps) {
  return (
    <td className={`px-4 py-3 whitespace-nowrap text-${align || 'left'} ${className}`}>{children}</td>
  );
}

interface TableHeadCellProps {
  children: React.ReactNode;
  className?: string;
  sortable?: boolean;
  style?: React.CSSProperties;
}

export function TableHeadCell({ children, className = '', sortable, style }: TableHeadCellProps) {
  return (
    <th
      style={style}
      className={`px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider ${
        sortable ? 'cursor-pointer hover:text-foreground' : ''
      } ${className}`}
    >
      {children}
    </th>
  );
}
