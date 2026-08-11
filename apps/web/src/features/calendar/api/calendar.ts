import { request } from '../../../lib/request';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  type: 'task' | 'activity';
  status?: string;
  priority?: string;
  description?: string;
  assignedTo?: { id: string; name: string };
  contactId?: string;
  companyId?: string;
  dealId?: string;
  leadId?: string;
  allDay?: boolean;
}

export interface TaskResponse {
  id: string;
  title: string;
  description?: string | null;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string | null;
  assignedTo?: { id: string; name: string };
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
  leadId?: string | null;
  reminderAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityResponse {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'demo' | 'follow_up' | 'note' | 'other';
  subject: string;
  description?: string;
  occurredAt: string;
  durationMinutes?: number;
  owner?: { id: string; name: string };
  contactId?: string;
  companyId?: string;
  leadId?: string;
  dealId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export const calendarApi = {
  list: async (startDate: string, endDate: string) => {
    const tasks = request<{ data: TaskResponse[] }>(`/tasks?dueAfter=${startDate}&dueBefore=${endDate}&limit=100`);
    const activities = request<{ data: ActivityResponse[] }>(`/activities?from=${startDate}&to=${endDate}&limit=100`);
    const [tasksRes, activitiesRes] = await Promise.all([tasks, activities]);

    const events: CalendarEvent[] = [];

    for (const task of tasksRes.data) {
      if (task.dueDate) {
        events.push({
          id: task.id,
          title: task.title,
          start: task.dueDate,
          end: task.dueDate,
          type: 'task',
          status: task.status,
          priority: task.priority,
          description: task.description || undefined,
          assignedTo: task.assignedTo,
          contactId: task.contactId || undefined,
          companyId: task.companyId || undefined,
          dealId: task.dealId || undefined,
          leadId: task.leadId || undefined,
          allDay: true,
        });
      }
    }

    for (const activity of activitiesRes.data) {
      const start = activity.occurredAt;
      const end = activity.durationMinutes
        ? new Date(new Date(start).getTime() + activity.durationMinutes * 60000).toISOString()
        : start;
      events.push({
        id: activity.id,
        title: activity.subject,
        start,
        end,
        type: 'activity',
        status: activity.type,
        description: activity.description || undefined,
        contactId: activity.contactId || undefined,
        companyId: activity.companyId || undefined,
        dealId: activity.dealId || undefined,
        leadId: activity.leadId || undefined,
        allDay: false,
      });
    }

    return events;
  },
};
