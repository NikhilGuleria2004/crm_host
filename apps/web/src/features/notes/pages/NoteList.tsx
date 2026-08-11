import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@crm/ui';
import { EmptyState } from '@crm/ui';
import { useNotes } from '../hooks/useNotes';

export function NoteList() {
  const [filters] = useState<Record<string, unknown>>({});

  const { data, isLoading, error } = useNotes({
    limit: 50,
    sort: 'createdAt',
    direction: 'desc',
    ...filters,
  });

  if (error) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Notes</h1>
          <p className="text-muted-foreground mt-1">All notes across your CRM.</p>
        </div>
        <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
          Unable to load notes. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Notes</h1>
          <p className="text-muted-foreground mt-1">All notes across your CRM.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">
            Filters
          </Button>
          <Link to="/app/notes/new">
            <Button size="sm">
              <Plus size={16} className="mr-2" />
              Add Note
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <EmptyState
          title="No notes found"
          description="Notes will appear here as you add them to records."
          action={
            <Link to="/app/notes/new">
              <Button>Add Note</Button>
            </Link>
          }
        />
      ) : (
        <div className="bg-white border border-border rounded">
          {data?.data.map((note) => (
            <div key={note.id} className="px-6 py-4 border-b border-border last:border-b-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  {note.title && (
                    <p className="text-sm font-medium text-foreground">{note.title}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{note.body}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {note.author?.name} · {new Date(note.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
