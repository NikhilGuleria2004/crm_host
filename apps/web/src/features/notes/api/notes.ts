import { request } from '../../../lib/request';

export const notesApi = {
  list: (params?: Record<string, unknown>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return request<{ data: NoteResponse[]; meta: { limit: number; hasMore: boolean; nextCursor: string | null } }>(
      `/notes${query ? `?${query}` : ''}`
    );
  },

  get: (id: string) =>
    request<{ data: NoteDetailResponse }>(`/notes/${id}`),

  create: (data: CreateNoteInput) =>
    request<{ data: NoteResponse }>('/notes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateNoteInput) =>
    request<{ data: NoteResponse }>(`/notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/notes/${id}`, {
      method: 'DELETE',
    }),

  bulkDelete: (ids: string[]) =>
    request<{ data: { deleted: number; failed: number } }>('/notes/bulk/delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
};

export interface NoteResponse {
  id: string;
  title?: string;
  body: string;
  author?: { id: string; name: string };
  contactId?: string;
  companyId?: string;
  leadId?: string;
  dealId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteDetailResponse extends NoteResponse {
  createdBy: string;
}

export interface CreateNoteInput {
  title?: string | null;
  body: string;
  contactId?: string | null;
  companyId?: string | null;
  leadId?: string | null;
  dealId?: string | null;
}

export interface UpdateNoteInput {
  title?: string | null;
  body?: string;
}
