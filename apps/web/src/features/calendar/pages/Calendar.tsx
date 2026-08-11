import { useState } from 'react';
import { useCalendarEvents } from '../hooks/useCalendar';
import { CalendarView } from '../components/CalendarView';
import type { CalendarEvent } from '../api/calendar';
import { Button } from '@crm/ui';

export function CalendarPage() {
  const [startDate] = useState<string>(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return start.toISOString().split('T')[0];
  });
  const [endDate] = useState<string>(() => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return end.toISOString().split('T')[0];
  });
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const { data: events = [], isLoading } = useCalendarEvents(startDate, endDate);

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Calendar</h1>
        <p className="text-muted-foreground mt-1">View your tasks and activities.</p>
      </div>

      <CalendarView events={events} isLoading={isLoading} onEventClick={handleEventClick} />

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setSelectedEvent(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white border border-border rounded shadow-lg w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{selectedEvent.title}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                      {selectedEvent.type}
                    </span>
                    {selectedEvent.status && (
                      <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                        {selectedEvent.status.replace('_', ' ')}
                      </span>
                    )}
                    {selectedEvent.priority && (
                      <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                        {selectedEvent.priority} priority
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => setSelectedEvent(null)} className="text-muted-foreground hover:text-foreground">
                  ✕
                </button>
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <span className="text-sm text-muted-foreground">When</span>
                  <p className="text-sm text-foreground font-medium">
                    {new Date(selectedEvent.start).toLocaleString()}
                    {selectedEvent.end && !selectedEvent.allDay && ` - ${new Date(selectedEvent.end).toLocaleTimeString()}`}
                  </p>
                </div>
                {selectedEvent.description && (
                  <div>
                    <span className="text-sm text-muted-foreground">Description</span>
                    <p className="text-sm text-foreground font-medium">{selectedEvent.description}</p>
                  </div>
                )}
                {selectedEvent.assignedTo && (
                  <div>
                    <span className="text-sm text-muted-foreground">Assigned To</span>
                    <p className="text-sm text-foreground font-medium">{selectedEvent.assignedTo.name}</p>
                  </div>
                )}
                {selectedEvent.contactId && (
                  <div>
                    <span className="text-sm text-muted-foreground">Contact</span>
                    <p className="text-sm text-foreground font-medium">#{selectedEvent.contactId}</p>
                  </div>
                )}
                {selectedEvent.companyId && (
                  <div>
                    <span className="text-sm text-muted-foreground">Company</span>
                    <p className="text-sm text-foreground font-medium">#{selectedEvent.companyId}</p>
                  </div>
                )}
                {selectedEvent.dealId && (
                  <div>
                    <span className="text-sm text-muted-foreground">Deal</span>
                    <p className="text-sm text-foreground font-medium">#{selectedEvent.dealId}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 flex justify-end gap-3 border-t border-border">
              <Button variant="secondary" onClick={() => setSelectedEvent(null)}>Close</Button>
              <Button
                onClick={() => {
                  if (selectedEvent.type === 'task') {
                    window.location.href = `/app/tasks/${selectedEvent.id}`;
                  } else {
                    window.location.href = `/app/activities/${selectedEvent.id}`;
                  }
                }}
              >
                Open Record
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
