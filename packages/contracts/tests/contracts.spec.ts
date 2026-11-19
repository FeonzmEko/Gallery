import { describe, it, expect } from 'vitest';
import {
  VisibilitySchema,
  EntryStatusSchema,
  MediaTypeSchema,
  CreateEntryInputSchema,
  successResponse,
  errorResponse,
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  isAppError,
  ErrorCode,
  hasAdminPrivileges,
  canViewEntry,
  createDomainEvent,
  DomainEventType,
} from '../src/index.js';

describe('@archive/contracts schemas and models', () => {
  it('should validate Visibility and EntryStatus', () => {
    expect(VisibilitySchema.parse('public')).toBe('public');
    expect(VisibilitySchema.parse('private')).toBe('private');
    expect(VisibilitySchema.parse('unlisted')).toBe('unlisted');
    expect(() => VisibilitySchema.parse('invalid')).toThrow();

    expect(EntryStatusSchema.parse('published')).toBe('published');
    expect(EntryStatusSchema.parse('draft')).toBe('draft');
    expect(EntryStatusSchema.parse('archived')).toBe('archived');
  });

  it('should validate MediaTypeSchema', () => {
    expect(MediaTypeSchema.parse('image')).toBe('image');
    expect(MediaTypeSchema.parse('video')).toBe('video');
    expect(MediaTypeSchema.parse('audio')).toBe('audio');
    expect(MediaTypeSchema.parse('document')).toBe('document');
    expect(() => MediaTypeSchema.parse('binary')).toThrow();
  });

  it('should validate CreateEntryInputSchema', () => {
    const valid = {
      type: 'journal',
      title: '今天的天空很蓝',
      occurredAt: 1732000000000,
      visibility: 'public' as const,
      status: 'published' as const,
    };
    const parsed = CreateEntryInputSchema.parse(valid);
    expect(parsed.title).toBe('今天的天空很蓝');
    expect(parsed.visibility).toBe('public');

    // Title cannot be empty
    expect(() =>
      CreateEntryInputSchema.parse({
        ...valid,
        title: '   ',
      })
    ).toThrow();
  });
});

describe('API Response contracts', () => {
  it('should generate standard success responses', () => {
    const resp = successResponse({ id: '123' }, { requestId: 'req_test' });
    expect(resp.success).toBe(true);
    expect(resp.data).toEqual({ id: '123' });
    expect(resp.meta?.requestId).toBe('req_test');
    expect(typeof resp.meta?.timestamp).toBe('number');
  });

  it('should generate standard error responses', () => {
    const resp = errorResponse('TEST_ERR', 'Something broke', [{ message: 'detail' }]);
    expect(resp.success).toBe(false);
    expect(resp.error.code).toBe('TEST_ERR');
    expect(resp.error.message).toBe('Something broke');
    expect(resp.error.details?.length).toBe(1);
  });
});

describe('AppError hierarchy', () => {
  it('should maintain status codes and prototype', () => {
    const notFound = new NotFoundError('Entry', 'entry_01');
    expect(isAppError(notFound)).toBe(true);
    expect(notFound.statusCode).toBe(404);
    expect(notFound.code).toBe(ErrorCode.NOT_FOUND);
    expect(notFound.message).toContain('entry_01');

    const unauthorized = new UnauthorizedError();
    expect(unauthorized.statusCode).toBe(401);

    const forbidden = new ForbiddenError();
    expect(forbidden.statusCode).toBe(403);

    const validation = new ValidationError('Bad input', [{ field: 'title', message: 'required' }]);
    expect(validation.statusCode).toBe(400);
    expect(validation.details?.[0]?.field).toBe('title');
  });
});

describe('RBAC rules', () => {
  it('should verify admin privileges', () => {
    expect(hasAdminPrivileges('owner')).toBe(true);
    expect(hasAdminPrivileges('admin')).toBe(true);
    expect(hasAdminPrivileges('viewer')).toBe(false);
    expect(hasAdminPrivileges('guest')).toBe(false);
    expect(hasAdminPrivileges(null)).toBe(false);
  });

  it('should enforce public read and admin write on entries', () => {
    // Public + published entry
    expect(canViewEntry('guest', 'public', 'published')).toBe(true);
    expect(canViewEntry(null, 'public', 'published')).toBe(true);

    // Private entry
    expect(canViewEntry('guest', 'private', 'published')).toBe(false);
    expect(canViewEntry(null, 'private', 'published')).toBe(false);
    expect(canViewEntry('admin', 'private', 'published')).toBe(true);

    // Draft entry
    expect(canViewEntry('guest', 'public', 'draft')).toBe(false);
    expect(canViewEntry('admin', 'public', 'draft')).toBe(true);

    // Soft deleted entry
    expect(canViewEntry('guest', 'public', 'published', 1732000000)).toBe(false);
    expect(canViewEntry('admin', 'public', 'published', 1732000000)).toBe(true);
  });
});

describe('Domain Events', () => {
  it('should create domain event with defaults', () => {
    const evt = createDomainEvent(DomainEventType.ENTRY_PUBLISHED, {
      entryId: 'e1',
      ownerId: 'u1',
      type: 'journal',
      title: 'Hello',
      occurredAt: 1732000000000,
      visibility: 'public' as const,
    });
    expect(evt.type).toBe('entry.published');
    expect(evt.payload.entryId).toBe('e1');
    expect(evt.id.startsWith('evt_')).toBe(true);
    expect(typeof evt.occurredAt).toBe('number');
  });
});
