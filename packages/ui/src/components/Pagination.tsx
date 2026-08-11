interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export function Pagination({ currentPage, totalPages, onPageChange, disabled }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  const showEllipsis = totalPages > 7;

  if (!showEllipsis) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <nav className="flex items-center justify-between px-4 py-3 border-t border-border" aria-label="Pagination">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={disabled || currentPage === 1}
          className="relative inline-flex items-center rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={disabled || currentPage === totalPages}
          className="relative ml-3 inline-flex items-center rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-center">
        <div className="inline-flex -space-x-px rounded-md shadow-sm" role="group">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={disabled || currentPage === 1}
            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-sm font-medium text-foreground border border-border bg-white hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="sr-only">Previous</span>
            ‹
          </button>
          {pages.map((page, idx) =>
            page === '...' ? (
              <span key={`ellipsis-${idx}`} className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-muted-foreground border border-border bg-white">
                …
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                disabled={disabled}
                aria-current={page === currentPage ? 'page' : undefined}
                className={`relative inline-flex items-center px-4 py-2 text-sm font-medium border border-border disabled:cursor-not-allowed ${
                  page === currentPage
                    ? 'z-10 bg-primary text-primary-foreground border-primary'
                    : 'bg-white text-foreground hover:bg-muted/50'
                }`}
              >
                {page}
              </button>
            )
          )}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={disabled || currentPage === totalPages}
            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-sm font-medium text-foreground border border-border bg-white hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="sr-only">Next</span>
            ›
          </button>
        </div>
      </div>
    </nav>
  );
}
