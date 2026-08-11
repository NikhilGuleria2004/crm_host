export interface NoteResponse {
  id: string;
  title?: string;
  body: string;
  author?: {
    id: string;
    name: string;
  };
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

export interface NoteListParams {
  limit?: number;
  cursor?: string;
  contactId?: string;
  companyId?: string;
  leadId?: string;
  dealId?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export interface NoteListResponse {
  data: NoteResponse[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface NoteListQuery {
  limit?: number;
  cursor?: string;
  contactId?: string;
  companyId?: string;
  leadId?: string;
  dealId?: string;
  sort?: 'createdAt' | 'updatedAt' | 'title';
  direction?: 'asc' | 'desc';
}
