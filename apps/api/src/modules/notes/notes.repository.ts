import { ObjectId } from 'mongodb';
import { collections } from '../../db/collections';
import type { NoteDocument } from '../../types/documents';
import type { NoteResponse, NoteDetailResponse } from './notes.types';
import { FilterEngine } from '../filters/filters.engine';
import { NOTE_FILTERS } from '../filters/filters.definitions';

function toResponse(doc: NoteDocument, authorName?: string): NoteResponse {
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    body: doc.body,
    author: doc.authorId
      ? { id: doc.authorId.toHexString(), name: authorName || '' }
      : undefined,
    contactId: doc.contactId?.toHexString(),
    companyId: doc.companyId?.toHexString(),
    leadId: doc.leadId?.toHexString(),
    dealId: doc.dealId?.toHexString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

interface CreateNotePayload {
  organizationId: string;
  title?: string;
  body: string;
  authorId: ObjectId;
  contactId?: ObjectId;
  companyId?: ObjectId;
  leadId?: ObjectId;
  dealId?: ObjectId;
  createdBy: ObjectId;
  updatedBy: ObjectId;
}

interface UpdateNotePayload {
  title?: string | null;
  body?: string;
  updatedBy: ObjectId;
}

export class NoteRepository {
  async findById(id: string, organizationId: string): Promise<NoteDocument | null> {
    const doc = await collections.notes().findOne({
      _id: new ObjectId(id),
      organizationId: new ObjectId(organizationId),
      deletedAt: { $exists: false },
    });
    return doc as NoteDocument | null;
  }

  async list(organizationId: string, params: {
    limit: number;
    cursor?: string;
    contactId?: string;
    companyId?: string;
    leadId?: string;
    dealId?: string;
    sort?: string;
    direction?: 'asc' | 'desc';
  }): Promise<{ data: NoteDocument[]; nextCursor: string | null; hasMore: boolean }> {
    const engine = new FilterEngine(NOTE_FILTERS);

    const query: Record<string, unknown> = engine.buildMongoQuery(
      engine.parseQuery({
        contactId: params.contactId,
        companyId: params.companyId,
        leadId: params.leadId,
        dealId: params.dealId,
      }).filters || [],
      organizationId
    );

    query.deletedAt = { $exists: false };

    if (params.cursor) {
      const cursorDate = new Date(params.cursor);
      const sortField = params.sort === 'updatedAt' ? 'updatedAt' : 'createdAt';
      query[sortField] = { $lt: cursorDate };
    }

    const data = await collections.notes()
      .find(query)
      .sort(engine.buildSort(params.sort, params.direction || 'desc') as any)
      .limit(params.limit + 1)
      .toArray();

    const hasMore = data.length > params.limit;
    const items = hasMore ? data.slice(0, params.limit) : data;

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      nextCursor = items[items.length - 1].createdAt.toISOString();
    }

    return {
      data: items as NoteDocument[],
      nextCursor,
      hasMore,
    };
  }

  async create(input: CreateNotePayload): Promise<NoteDocument> {
    const now = new Date();

    const result = await collections.notes().insertOne({
      organizationId: new ObjectId(input.organizationId),
      title: input.title,
      body: input.body,
      authorId: input.authorId,
      contactId: input.contactId,
      companyId: input.companyId,
      leadId: input.leadId,
      dealId: input.dealId,
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
      createdAt: now,
      updatedAt: now,
    } as any);

    const doc = await collections.notes().findOne({ _id: result.insertedId });
    if (!doc) throw new Error('Failed to create note');
    return doc as NoteDocument;
  }

  async update(id: string, organizationId: string, input: UpdateNotePayload): Promise<NoteDocument | null> {
    const now = new Date();
    const update: Record<string, unknown> = { updatedAt: now };

    if (input.title !== undefined) update.title = input.title;
    if (input.body !== undefined) update.body = input.body;

    await collections.notes().updateOne(
      { _id: new ObjectId(id), organizationId: new ObjectId(organizationId) },
      { $set: update }
    );

    const doc = await collections.notes().findOne({ _id: new ObjectId(id) });
    return doc as NoteDocument | null;
  }

  async softDelete(id: string, organizationId: string): Promise<void> {
    await collections.notes().updateOne(
      { _id: new ObjectId(id), organizationId: new ObjectId(organizationId) },
      { $set: { deletedAt: new Date() } }
    );
  }

  async getUserName(userId: ObjectId): Promise<string | undefined> {
    const doc = await collections.users().findOne({ _id: userId });
    return doc ? `${(doc as any).firstName} ${(doc as any).lastName || ''}`.trim() : undefined;
  }

  async getUserNames(userIds: ObjectId[]): Promise<Map<string, string>> {
    const docs = await collections.users()
      .find({ _id: { $in: userIds } })
      .toArray();
    const map = new Map<string, string>();
    for (const doc of docs) {
      map.set(doc._id.toHexString(), `${(doc as any).firstName} ${(doc as any).lastName || ''}`.trim());
    }
    return map;
  }

  toResponse(doc: NoteDocument | null, authorName?: string): NoteResponse | null {
    if (!doc) return null;
    return toResponse(doc, authorName);
  }

  toDetailResponse(doc: NoteDocument | null, authorName?: string): NoteDetailResponse | null {
    if (!doc) return null;
    const response = toResponse(doc, authorName);
    if (!response) return null;
    return {
      ...response,
      createdBy: doc.authorId.toHexString(),
    };
  }
}
