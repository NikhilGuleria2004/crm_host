import { useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfDay,
  endOfDay,
  isSameDay,
  isToday,
  format,
  setHours,
  setMinutes,
} from 'date-fns';
import { Button } from '@crm/ui';
import { Tabs, TabsList, TabsTrigger } from '@crm/ui';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import type { CalendarEvent } from '../api/calendar';

type ViewMode = 'month' | 'week' | 'day' | 'agenda';

interface CalendarViewProps {
  events: CalendarEvent[];
  isLoading?: boolean;
  onEventClick?: (event: CalendarEvent) => void;
}

const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  month: 'Month',
  week: 'Week',
  day: 'Day',
  agenda: 'Agenda',
};

export function CalendarView({ events, isLoading, onEventClick }: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDateRange = () => {
    switch (viewMode) {
      case 'month':
        return { start: startOfWeek(startOfMonth(currentDate)), end: endOfWeek(endOfMonth(currentDate)) };
      case 'week':
        return { start: startOfWeek(currentDate), end: endOfWeek(currentDate) };
      case 'day':
        return { start: startOfDay(currentDate), end: endOfDay(currentDate) };
      case 'agenda': {
        const today = startOfDay(new Date());
        return { start: today, end: addDays(today, 14) };
      }
      default:
        return { start: startOfWeek(startOfMonth(currentDate)), end: endOfWeek(endOfMonth(currentDate)) };
    }
  };

  const dateRange = getDateRange();
  const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });

  const goToToday = () => setCurrentDate(new Date());
  const goToPrevious = () => {
    switch (viewMode) {
      case 'month': setCurrentDate(subMonths(currentDate, 1)); break;
      case 'week': setCurrentDate(subWeeks(currentDate, 1)); break;
      case 'day': setCurrentDate(subDays(currentDate, 1)); break;
      case 'agenda': setCurrentDate(subDays(currentDate, 14)); break;
    }
  };
  const goToNext = () => {
    switch (viewMode) {
      case 'month': setCurrentDate(addMonths(currentDate, 1)); break;
      case 'week': setCurrentDate(addWeeks(currentDate, 1)); break;
      case 'day': setCurrentDate(addDays(currentDate, 1)); break;
      case 'agenda': setCurrentDate(addDays(currentDate, 14)); break;
    }
  };

  const getHeaderLabel = () => {
    switch (viewMode) {
      case 'month': return format(currentDate, 'MMMM yyyy');
      case 'week': {
        const weekStart = startOfWeek(currentDate);
        const weekEnd = endOfWeek(currentDate);
        if (isSameDay(weekStart, weekEnd)) return format(weekStart, 'MMM d, yyyy');
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      }
      case 'day': return format(currentDate, 'EEEE, MMMM d, yyyy');
      case 'agenda': return `Next 14 days`;
      default: return format(currentDate, 'MMMM yyyy');
    }
  };

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start);
      return isSameDay(eventDate, day);
    });
  };

  const getEventColor = (event: CalendarEvent) => {
    if (event.type === 'task') {
      switch (event.status) {
        case 'completed': return 'bg-success/10 text-success border-success/20';
        case 'in_progress': return 'bg-primary/10 text-primary border-primary/20';
        case 'cancelled': return 'bg-danger/10 text-danger border-danger/20';
        default: return 'bg-warning/10 text-warning border-warning/20';
      }
    }
    switch (event.status) {
      case 'meeting': return 'bg-primary/10 text-primary border-primary/20';
      case 'call': return 'bg-success/10 text-success border-success/20';
      case 'follow_up': return 'bg-warning/10 text-warning border-warning/20';
      case 'demo': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'email': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-muted/50 rounded animate-pulse" />
          <div className="h-9 w-96 bg-muted/50 rounded animate-pulse" />
        </div>
        <div className="h-[600px] bg-muted/50 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <CalendarIcon size={20} className="text-muted-foreground" />
          <h2 className="text-xl font-semibold text-foreground">{getHeaderLabel()}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={goToToday}>Today</Button>
          <Button variant="ghost" size="sm" onClick={goToPrevious}>
            <ChevronLeft size={16} />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToNext}>
            <ChevronRight size={16} />
          </Button>
          <Tabs defaultValue={viewMode} value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              {(Object.keys(VIEW_MODE_LABELS) as ViewMode[]).map((mode) => (
                <TabsTrigger key={mode} value={mode}>
                  {VIEW_MODE_LABELS[mode]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {viewMode === 'month' && (
        <div className="bg-white border border-border rounded overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {weekDays.map((day) => (
              <div key={day} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground border-r border-border last:border-r-0">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[100px] p-2 border-r border-b border-border last:border-r-0 ${
                    !isCurrentMonth ? 'bg-muted/30' : ''
                  } ${isToday(day) ? 'bg-primary/5' : ''}`}
                >
                  <div className={`text-sm font-medium mb-1 ${isToday(day) ? 'text-primary' : 'text-foreground'}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        onClick={() => onEventClick?.(event)}
                        className={`text-xs px-1.5 py-0.5 rounded border cursor-pointer truncate ${getEventColor(event)}`}
                      >
                        {event.type === 'task' && '✓ '}
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-muted-foreground pl-1">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === 'week' && (
        <div className="bg-white border border-border rounded overflow-hidden">
          <div className="grid grid-cols-8 border-b border-border">
            <div className="px-2 py-2 text-center text-xs font-medium text-muted-foreground border-r border-border" />
            {weekDays.map((day) => (
              <div key={day} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground border-r border-border last:border-r-0">
                <div>{day}</div>
                <div className={`text-sm font-semibold ${isToday(days[weekDays.indexOf(day)]) ? 'text-primary' : 'text-foreground'}`}>
                  {format(days[weekDays.indexOf(day)], 'd')}
                </div>
              </div>
            ))}
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b border-border last:border-b-0">
                <div className="px-2 py-2 text-xs text-muted-foreground border-r border-border text-right">
                  {format(setHours(setMinutes(new Date(), 0), hour), 'h a')}
                </div>
                {weekDays.map((_, dayIndex) => {
                  const day = days[dayIndex];
                  const hourEvents = events.filter((event) => {
                    const eventDate = new Date(event.start);
                    return isSameDay(eventDate, day) && eventDate.getHours() === hour;
                  });
                  return (
                    <div key={dayIndex} className="min-h-[60px] p-1 border-r border-border last:border-r-0 relative">
                      {hourEvents.map((event) => (
                        <div
                          key={event.id}
                          onClick={() => onEventClick?.(event)}
                          className={`text-xs px-1.5 py-0.5 rounded border cursor-pointer truncate mb-1 ${getEventColor(event)}`}
                        >
                          {event.title}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'day' && (
        <div className="bg-white border border-border rounded overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
            {hours.map((hour) => {
              const hourEvents = events.filter((event) => {
                const eventDate = new Date(event.start);
                return isSameDay(eventDate, currentDate) && eventDate.getHours() === hour;
              });
              return (
                <div key={hour} className="grid grid-cols-[80px_1fr] border-b border-border last:border-b-0">
                  <div className="px-3 py-2 text-xs text-muted-foreground border-r border-border text-right">
                    {format(setHours(setMinutes(new Date(), 0), hour), 'h a')}
                  </div>
                  <div className="min-h-[60px] p-2 relative">
                    {hourEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={() => onEventClick?.(event)}
                        className={`text-sm px-3 py-1.5 rounded border cursor-pointer mb-1 ${getEventColor(event)}`}
                      >
                        <div className="font-medium">{event.title}</div>
                        {event.description && (
                          <div className="text-xs opacity-80 truncate">{event.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === 'agenda' && (
        <div className="bg-white border border-border rounded divide-y divide-border">
          {days.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No events in the next 14 days</div>
          ) : (
            days.map((day) => {
              const dayEvents = getEventsForDay(day);
              if (dayEvents.length === 0) return null;
              return (
                <div key={day.toISOString()} className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`text-sm font-semibold ${isToday(day) ? 'text-primary' : 'text-foreground'}`}>
                      {isToday(day) ? 'Today' : format(day, 'EEEE, MMMM d')}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={() => onEventClick?.(event)}
                        className={`flex items-start gap-3 p-3 rounded border cursor-pointer ${getEventColor(event)}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {event.type === 'task' ? '✓ ' : ''}{event.title}
                            </span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-black/5 capitalize">
                              {event.type}
                            </span>
                          </div>
                          {event.description && (
                            <div className="text-xs opacity-80 mt-1 line-clamp-1">{event.description}</div>
                          )}
                          {event.assignedTo && (
                            <div className="text-xs opacity-70 mt-1">Assigned to {event.assignedTo.name}</div>
                          )}
                        </div>
                        <div className="text-xs opacity-70 whitespace-nowrap">
                          {format(new Date(event.start), 'h:mm a')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
