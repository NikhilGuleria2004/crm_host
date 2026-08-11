import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { CommandMenu, CommandGroup, CommandItem } from '@crm/ui';
import { useSearch } from '../hooks/useSearch';
import type { SearchResult } from '../api/search';

const ENTITY_LABELS: Record<string, string> = {
  contact: 'Contacts',
  company: 'Companies',
  deal: 'Deals',
  task: 'Tasks',
  lead: 'Leads',
};

const ENTITY_ICONS: Record<string, string> = {
  contact: '👤',
  company: '🏢',
  deal: '💼',
  task: '✓',
  lead: '⭐',
};

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { data, isLoading } = useSearch(query);

  const results = data?.data || [];

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, result) => {
    if (!acc[result.type]) acc[result.type] = [];
    acc[result.type].push(result);
    return acc;
  }, {});

  const handleSelect = useCallback(
    (result: SearchResult) => {
      onClose();
      navigate(`/app/${result.type}s/${result.id}`);
    },
    [navigate, onClose]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!open) return null;

  return (
    <CommandMenu open={open} onClose={onClose}>
      <div className="flex items-center border-b border-border px-4">
        <Search size={16} className="text-muted-foreground mr-2" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 w-full bg-transparent text-sm outline-none"
          placeholder="Search contacts, companies, deals, tasks, leads..."
        />
        {query && (
          <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        )}
      </div>
      <div className="max-h-96 overflow-auto p-2">
        {isLoading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Searching...</div>
        ) : query && results.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No results found</div>
        ) : (
          Object.entries(grouped).map(([type, items]) => (
            <CommandGroup key={type} heading={ENTITY_LABELS[type] || type}>
              {items.map((result) => (
                <CommandItem key={`${result.type}-${result.id}`} onSelect={() => handleSelect(result)}>
                  <span className="mr-2">{ENTITY_ICONS[result.type] || '📄'}</span>
                  <span className="flex-1">
                    <span className="text-sm font-medium">{result.title}</span>
                    {result.subtitle && (
                      <span className="text-xs text-muted-foreground ml-2">{result.subtitle}</span>
                    )}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))
        )}
      </div>
    </CommandMenu>
  );
}
