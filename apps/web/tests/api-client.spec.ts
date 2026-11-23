import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  apiClient,
  getStoredToken,
  setStoredToken,
  onUnauthorized,
  getRandomEntry,
  listCollections,
  getCollectionMedia,
  createCollection,
  bindCollectionMedia,
  listMediaComments,
  postMediaComment,
  getCuratorProfile,
  updateCuratorProfile,
  exportArchiveBackup,
} from '../src/shared/api/client';
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ConflictError,
  AppError,
  ErrorCode,
} from '@archive/contracts';

describe('API Client (@archive/web/src/shared/api/client)', () => {
  const originalFetch = globalThis.fetch;
  const originalLocalStorage = globalThis.localStorage;

  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    globalThis.localStorage = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
      length: 0,
      key: () => null,
    } as any;

    setStoredToken(null);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalLocalStorage;
    vi.restoreAllMocks();
  });

  it('manages token storage via setStoredToken and getStoredToken', () => {
    expect(getStoredToken()).toBeNull();
    setStoredToken('test-token-123');
    expect(getStoredToken()).toBe('test-token-123');
    expect(globalThis.localStorage.getItem('archive_auth_token')).toBe('test-token-123');

    setStoredToken(null);
    expect(getStoredToken()).toBeNull();
    expect(globalThis.localStorage.getItem('archive_auth_token')).toBeNull();
  });

  it('sends correct headers and unwraps successful data', async () => {
    let capturedRequest: { url: string; headers: Headers; body?: any; method?: string } | null = null;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      capturedRequest = {
        url,
        headers: new Headers(init?.headers),
        body: init?.body,
        method: init?.method,
      };
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: true,
          data: { id: 'entry-1', title: 'Hello Archive' },
          meta: { timestamp: 123456789 },
        }),
      } as Response;
    });

    setStoredToken('bearer-jwt-token');

    const result = await apiClient.get<{ id: string; title: string }>('/api/v1/entries', {
      params: { limit: 10, visibility: 'public' },
    });

    expect(result).toEqual({ id: 'entry-1', title: 'Hello Archive' });
    expect(capturedRequest).not.toBeNull();
    expect(capturedRequest!.url).toContain('/api/v1/entries?limit=10&visibility=public');
    expect(capturedRequest!.headers.get('Authorization')).toBe('Bearer bearer-jwt-token');
    expect(capturedRequest!.headers.get('Accept')).toBe('application/json');
    expect(capturedRequest!.headers.get('x-request-id')).toMatch(/^req_/);
  });

  it('maps 401 response and ErrorCode.UNAUTHORIZED to UnauthorizedError and triggers onUnauthorized callback', async () => {
    let unauthorizedTriggered = false;
    onUnauthorized(() => {
      unauthorizedTriggered = true;
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        success: false,
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: '未登录或凭证已失效',
        },
      }),
    } as Response);

    setStoredToken('expired-token');

    await expect(apiClient.get('/api/v1/auth/me')).rejects.toThrow(UnauthorizedError);
    expect(unauthorizedTriggered).toBe(true);
    expect(getStoredToken()).toBeNull();
  });

  it('maps 403 response to ForbiddenError', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        success: false,
        error: {
          code: ErrorCode.FORBIDDEN,
          message: '权限不足，禁止写操作',
        },
      }),
    } as Response);

    await expect(apiClient.post('/api/v1/entries', { title: 'New' })).rejects.toThrow(ForbiddenError);
  });

  it('maps 404 response to NotFoundError', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: '条目未找到',
        },
      }),
    } as Response);

    await expect(apiClient.get('/api/v1/entries/not-existing')).rejects.toThrow(NotFoundError);
  });

  it('maps 400 validation response to ValidationError with error details', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: '参数错误',
          details: [{ field: 'email', message: '邮箱格式错误' }],
        },
      }),
    } as Response);

    try {
      await apiClient.post('/api/v1/auth/login', { email: 'invalid' });
      expect.fail('Should have thrown ValidationError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ValidationError);
      expect(err.details).toEqual([{ field: 'email', message: '邮箱格式错误' }]);
    }
  });

  it('catches network errors and wraps them into AppError with NETWORK_ERROR code', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    try {
      await apiClient.get('/api/v1/entries');
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.code).toBe('NETWORK_ERROR');
    }
  });

  it('fetches paginated data while preserving meta.pagination via getPaginated', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        success: true,
        data: [{ id: 'e1' }, { id: 'e2' }],
        meta: {
          timestamp: 123456,
          pagination: {
            cursor: 'next_cursor_abc',
            hasMore: true,
            limit: 2,
          },
        },
      }),
    } as Response);

    const res = await apiClient.getPaginated<{ id: string }>('/api/v1/entries', {
      params: { limit: 2 },
    });

    expect(res.items).toEqual([{ id: 'e1' }, { id: 'e2' }]);
    expect(res.pagination).toEqual({
      cursor: 'next_cursor_abc',
      hasMore: true,
      limit: 2,
    });
  });

  it('calls M2-3, M3-2, M4-1, and M4-3 typed endpoints with expected paths and methods', async () => {
    const calls: Array<{ url: string; method?: string; body?: string }> = [];
    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method, body: init?.body as string | undefined });
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: true,
          data: url.includes('/comments') ? [{ id: 'c1' }] : { ok: true },
          meta: { pagination: { cursor: null, hasMore: false, limit: 20 } },
        }),
      } as Response;
    });

    await getRandomEntry('e-prev');
    await listCollections();
    await getCollectionMedia('kyoto 2026');
    await createCollection({ title: 'Kyoto', visibility: 'public' });
    await bindCollectionMedia('col-1', { items: [{ mediaAssetId: 'm1', sortOrder: 0 }], replace: true });
    await listMediaComments('m1', { limit: 10 });
    await postMediaComment('m1', { authorName: 'A', authorEmail: 'a@b.c', content: 'Nice!' });
    await getCuratorProfile();
    await updateCuratorProfile({
      name: 'Curator',
      bio: 'Bio',
      statusText: 'Archiving',
      recentAnime: [],
      loopPlaylist: [],
    });
    await exportArchiveBackup();

    expect(calls[0]).toMatchObject({ url: '/api/v1/entries/random?excludeId=e-prev', method: 'GET' });
    expect(calls[1]).toMatchObject({ url: '/api/v1/collections', method: 'GET' });
    expect(calls[2]).toMatchObject({ url: '/api/v1/collections/kyoto%202026/media', method: 'GET' });
    expect(calls[3]).toMatchObject({ url: '/api/v1/collections', method: 'POST' });
    expect(calls[4]).toMatchObject({ url: '/api/v1/collections/col-1/media', method: 'POST' });
    expect(calls[5]).toMatchObject({ url: '/api/v1/media/m1/comments?limit=10', method: 'GET' });
    expect(calls[6]).toMatchObject({ url: '/api/v1/media/m1/comments', method: 'POST' });
    expect(calls[7]).toMatchObject({ url: '/api/v1/curator', method: 'GET' });
    expect(calls[8]).toMatchObject({ url: '/api/v1/admin/curator', method: 'PUT' });
    expect(calls[9]).toMatchObject({ url: '/api/v1/admin/export', method: 'GET' });
  });
});
