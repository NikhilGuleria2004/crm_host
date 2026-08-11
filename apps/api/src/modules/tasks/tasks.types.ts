export interface TaskResponse {
  id: string;
  title: string;
  description?: string | null;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string | null;
  assignedTo?: {
    id: string;
    name: string;
  };
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
  leadId?: string | null;
  reminderAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDetailResponse extends TaskResponse {
  createdBy: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  status?: 'open' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string | null;
  assignedTo?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
  leadId?: string | null;
  reminderAt?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: 'open' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string | null;
  assignedTo?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
  leadId?: string | null;
  reminderAt?: string | null;
}

export interface TaskListParams {
  limit?: number;
  cursor?: string;
  search?: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
  contactId?: string;
  companyId?: string;
  dealId?: string;
  leadId?: string;
  dueBefore?: string;
  dueAfter?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export interface TaskListQuery {
  limit?: number;
  cursor?: string;
  search?: string;
  status?: 'open' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  contactId?: string;
  companyId?: string;
  dealId?: string;
  leadId?: string;
  dueBefore?: string;
  dueAfter?: string;
  sort?: 'createdAt' | 'updatedAt' | 'dueDate' | 'priority' | 'title';
  direction?: 'asc' | 'desc';
}

export interface TaskListResponse {
  data: TaskResponse[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface CompleteTaskInput {
  status: 'completed';
}
