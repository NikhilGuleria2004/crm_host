import { ObjectId } from 'mongodb';
import { NoteRepository } from './notes.repository';
import type { CreateNoteInput, UpdateNoteInput, NoteResponse, NoteListResponse, NoteListQuery } from './notes.types';
import { auditLog } from '../../middleware/audit';

function toObjectId(value: string | undefined | null): ObjectId | undefined {
  if (!value || !/^[0-9a-f]{24}$/i.test(value)) return undefined;
  return new ObjectId(value);
}

export class NoteService {
  constructor(private repository: NoteRepository) {}

  async list(organizationId: string, params: NoteListQuery): Promise<NoteListResponse> {
    const limit = params.limit || 50;
    const sort = params.sort || 'createdAt';
    const direction = params.direction || 'desc';

    const result = await this.repository.list(organizationId, {
      limit,
      cursor: params.cursor,
      contactId: params.contactId,
      companyId: params.companyId,
      leadId: params.leadId,
      dealId: params.dealId,
      sort,
      direction,
    });

    const authorIds = result.data.map((doc) => doc.authorId).filter((id): id is ObjectId => id !== undefined && id !== null);
    const authorNames = authorIds.length > 0 ? await this.repository.getUserNames(authorIds) : new Map();

    const data = result.data.map((doc) => {
      const authorName = doc.authorId ? authorNames.get(doc.authorId.toHexString()) : undefined;
      return this.repository.toResponse(doc, authorName);
    });

    const filteredData = data.filter((note): note is NoteResponse => note !== null);

    return {
      data: filteredData,
      meta: {
        limit,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      },
    };
  }

  async create(organizationId: string, userId: string, input: CreateNoteInput): Promise<NoteResponse> {
    const note = await this.repository.create({
      organizationId,
      title: input.title || undefined,
      body: input.body,
      authorId: new ObjectId(userId),
      contactId: toObjectId(input.contactId),
      companyId: toObjectId(input.companyId),
      leadId: toObjectId(input.leadId),
      dealId: toObjectId(input.dealId),
      createdBy: new ObjectId(userId),
      updatedBy: new ObjectId(userId),
    });

    const authorName = note.authorId ? await this.repository.getUserName(note.authorId) : undefined;
    return this.repository.toResponse(note, authorName)!;
  }

  async getById(id: string, organizationId: string): Promise<NoteResponse | null> {
    const note = await this.repository.findById(id, organizationId);
    if (!note) return null;

    const authorName = note.authorId ? await this.repository.getUserName(note.authorId) : undefined;
    return this.repository.toDetailResponse(note, authorName);
  }

  async update(id: string, organizationId: string, userId: string, input: UpdateNoteInput): Promise<NoteResponse | null> {
    const existing = await this.repository.findById(id, organizationId);
    if (!existing) {
      return null;
    }

    const note = await this.repository.update(id, organizationId, {
      ...input,
      updatedBy: new ObjectId(userId),
    });

    if (!note) return null;

    const authorName = note.authorId ? await this.repository.getUserName(note.authorId) : undefined;
    return this.repository.toResponse(note, authorName);
  }

  async delete(id: string, organizationId: string, c: any): Promise<void> {
    const existing = await this.repository.findById(id, organizationId);
    if (!existing) {
      throw new Error('Note not found');
    }

    await this.repository.softDelete(id, organizationId);

    await auditLog(c, {
      action: 'note.deleted',
      entityType: 'note',
      entityId: id,
      before: {
        title: existing.title,
        body: existing.body,
      },
    });
  }

  async bulkDelete(ids: string[], organizationId: string, c: any): Promise<{ deleted: number; failed: number }> {
    let deleted = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        const existing = await this.repository.findById(id, organizationId);
        if (!existing) {
          failed++;
          continue;
        }

        await this.repository.softDelete(id, organizationId);

        await auditLog(c, {
          action: 'note.deleted',
          entityType: 'note',
          entityId: id,
          before: {
            title: existing.title,
            body: existing.body,
          },
        });

        deleted++;
      } catch {
        failed++;
      }
    }

    return { deleted, failed };
  }
}
