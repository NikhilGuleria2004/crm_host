import { useQuery, useQueryClient } from '@tanstack/react-query';
import { calendarApi } from '../api/calendar';

export function useCalendarEvents(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['calendar', 'events', startDate, endDate],
    queryFn: () => calendarApi.list(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
}

export function useInvalidateCalendar() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['calendar'] });
  };
}
