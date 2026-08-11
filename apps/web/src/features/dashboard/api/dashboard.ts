const API_BASE = '/api/v1';

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'An error occurred' } }));
    throw new Error(error.error?.message || 'An error occurred');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export interface DashboardSummaryData {
  pipelineValue: number;
  openDeals: number;
  wonRevenue: number;
  lostRevenue: number;
  winRate: number;
  newLeads: number;
  qualifiedLeads: number;
  overdueTasks: number;
}

export interface DashboardPipelineStage {
  stageId: string;
  stageName: string;
  dealCount: number;
  totalValue: number;
}

export const dashboardApi = {
  getSummary: () => request<{ data: DashboardSummaryData }>('/dashboard/summary'),
  getPipeline: () => request<{ data: DashboardPipelineStage[] }>('/dashboard/pipeline'),
};
