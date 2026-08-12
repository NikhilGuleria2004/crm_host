import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { NoteService } from '../src/modules/notes/notes.service';
import type { NoteRepository } from '../src/modules/notes/notes.repository';
import type { CreateNoteInput, UpdateNoteInput, NoteListQuery } from '../src/modules/notes/notes.types';

vi.mock('../src/middleware/audit', () => ({
  auditLog: vi.fn(),
}));

function createMockRepository(): vi.Mocked<NoteRepository> {
  return {
    list: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    findByIds: vi.fn(),
    getUserName: vi.fn(),
    getUserNames: vi.fn(),
    toResponse: vi.fn(),
    toDetailResponse: vi.fn(),
  } as any;
}

const orgId = new ObjectId().toHexString();
const userId = new ObjectId().toHexString();
const noteId = new ObjectId().toHexString();
const authorId = new ObjectId().toHexString();

const mockNoteDoc = {
  _id: new ObjectId(noteId),
  organizationId: new ObjectId(orgId),
  title: 'Customer requirements',
  body: 'Customer requires SSO and audit logs.',
  authorId: new ObjectId(authorId),
  contactId: undefined,
  companyId: undefined,
  leadId: undefined,
  dealId: undefined,
  createdBy: new ObjectId(userId),
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('P16 NoteService', () => {
  let repository: ReturnType<typeof createMockRepository>;
  let service: NoteService;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = createMockRepository();
    service = new NoteService(repository);
  });

  describe('list', () => {
    it('should return paginated notes with resolved author names', async () => {
      repository.list.mockResolvedValue({
        data: [mockNoteDoc],
        nextCursor: null,
        hasMore: false,
      });
      repository.getUserNames.mockResolvedValue(new Map([[authorId, 'John Doe']]));
      repository.toResponse.mockReturnValue({
        id: noteId,
        title: 'Customer requirements',
        body: 'Customer requires SSO and audit logs.',
        author: { id: authorId, name: 'John Doe' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await service.list(orgId, { limit: 10, sort: 'createdAt', direction: 'desc' });

      expect(repository.list).toHaveBeenCalledWith(orgId, expect.objectContaining({
        limit: 10,
        sort: 'createdAt',
        direction: 'desc',
      }));
      expect(result.data).toHaveLength(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.hasMore).toBe(false);
    });
  });

  describe('create', () => {
    it('should create a note with author from user id', async () => {
      repository.create.mockResolvedValue(mockNoteDoc as any);
      repository.getUserName.mockResolvedValue('John Doe');
      repository.toResponse.mockReturnValue({
        id: noteId,
        title: 'Customer requirements',
        body: 'Customer requires SSO and audit logs.',
        author: { id: authorId, name: 'John Doe' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const input: CreateNoteInput = {
        title: 'Customer requirements',
        body: 'Customer requires SSO and audit logs.',
      };

      const result = await service.create(orgId, userId, input);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          title: 'Customer requirements',
          body: 'Customer requires SSO and audit logs.',
        })
      );
      expect(result.title).toBe('Customer requirements');
    });
  });

  describe('getById', () => {
    it('should return note when found', async () => {
      repository.findById.mockResolvedValue(mockNoteDoc as any);
      repository.getUserName.mockResolvedValue('John Doe');
      repository.toDetailResponse.mockReturnValue({
        id: noteId,
        title: 'Customer requirements',
        body: 'Customer requires SSO and audit logs.',
        createdBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await service.getById(noteId, orgId);

      expect(repository.findById).toHaveBeenCalledWith(noteId, orgId);
      expect(result?.createdBy).toBe(userId);
    });

    it('should return null when note not found', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.getById(noteId, orgId);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update note and return updated record', async () => {
      repository.findById.mockResolvedValue(mockNoteDoc as any);
      repository.update.mockResolvedValue({
        ...mockNoteDoc,
        title: 'Updated requirements',
      } as any);
      repository.getUserName.mockResolvedValue('John Doe');
      repository.toResponse.mockReturnValue({
        id: noteId,
        title: 'Updated requirements',
        body: 'Customer requires SSO and audit logs.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const input: UpdateNoteInput = {
        title: 'Updated requirements',
      };

      const result = await service.update(noteId, orgId, userId, input);

      expect(repository.update).toHaveBeenCalledWith(
        noteId,
        orgId,
        expect.objectContaining({
          title: 'Updated requirements',
        })
      );
      expect(result?.title).toBe('Updated requirements');
    });

    it('should return null when note not found', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.update(noteId, orgId, userId, {});

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should soft delete and create audit log', async () => {
      repository.findById.mockResolvedValue(mockNoteDoc as any);
      repository.softDelete.mockResolvedValue(undefined);

      const mockCtx = {
        req: { header: vi.fn() },
        get: vi.fn((key: string) => {
          if (key === 'organizationId') return orgId;
          if (key === 'user') return { id: userId };
          return null;
        }),
      } as any;

      await service.delete(noteId, orgId, mockCtx);

      expect(repository.softDelete).toHaveBeenCalledWith(noteId, orgId);
    });

    it('should throw when note not found', async () => {
      repository.findById.mockResolvedValue(null);

      const mockCtx = {
        req: { header: vi.fn() },
        get: vi.fn(() => null),
      } as any;

      await expect(service.delete(noteId, orgId, mockCtx)).rejects.toThrow('Note not found');
    });
  });

  describe('bulkDelete', () => {
    it('should delete multiple notes and track failures', async () => {
      repository.findById
        .mockResolvedValueOnce(mockNoteDoc as any)
        .mockResolvedValueOnce(null);

      const mockCtx = {
        req: { header: vi.fn() },
        get: vi.fn((key: string) => {
          if (key === 'organizationId') return orgId;
          if (key === 'user') return { id: userId };
          return null;
        }),
      } as any;

      const result = await service.bulkDelete([noteId, 'nonexistent'], orgId, mockCtx);

      expect(result.deleted).toBe(1);
      expect(result.failed).toBe(1);
    });
  });
});
