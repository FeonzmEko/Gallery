import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../src/features/auth/stores/auth.store';
import { apiClient, setStoredToken, getStoredToken } from '../src/shared/api/client';
import { UnauthorizedError } from '@archive/contracts';

describe('Auth Store (@archive/web/src/features/auth/stores/auth.store)', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    setActivePinia(createPinia());
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
    vi.restoreAllMocks();
  });

  it('starts with guest unauthenticated state by default', () => {
    const store = useAuthStore();
    expect(store.isAuthenticated).toBe(false);
    expect(store.isAdmin).toBe(false);
    expect(store.user).toBeNull();
    expect(store.token).toBeNull();
    expect(store.isLoginModalOpen).toBe(false);
  });

  it('toggles login modal correctly', () => {
    const store = useAuthStore();
    expect(store.isLoginModalOpen).toBe(false);
    store.openLoginModal();
    expect(store.isLoginModalOpen).toBe(true);
    store.closeLoginModal();
    expect(store.isLoginModalOpen).toBe(false);
    store.toggleLoginModal();
    expect(store.isLoginModalOpen).toBe(true);
  });

  it('logs in successfully and promotes state to Admin', async () => {
    const store = useAuthStore();

    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      token: 'jwt-session-xyz',
      expiresAt: Date.now() + 86400000,
      user: {
        userId: 'admin-001',
        role: 'admin',
        displayName: 'Test Admin',
        email: 'admin@archive.internal',
      },
    });

    const user = await store.login('Admin@Pass2026');

    expect(user.displayName).toBe('Test Admin');
    expect(store.isAuthenticated).toBe(true);
    expect(store.isAdmin).toBe(true);
    expect(store.token).toBe('jwt-session-xyz');
    expect(getStoredToken()).toBe('jwt-session-xyz');
    expect(store.isLoginModalOpen).toBe(false);
  });

  it('handles login failure gracefully without updating state', async () => {
    const store = useAuthStore();

    vi.spyOn(apiClient, 'post').mockRejectedValueOnce(new Error('密码不正确'));

    await expect(store.login('WrongPass')).rejects.toThrow('密码不正确');
    expect(store.isAuthenticated).toBe(false);
    expect(store.isAdmin).toBe(false);
    expect(store.error).toBe('密码不正确');
    expect(store.token).toBeNull();
  });

  it('clears state on logout', async () => {
    const store = useAuthStore();

    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      token: 'mock-token',
      expiresAt: Date.now() + 1000,
      user: { userId: 'u1', role: 'admin' },
    });

    await store.login('pass');
    expect(store.isAuthenticated).toBe(true);

    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ message: '登出成功' });
    await store.logout();

    expect(store.isAuthenticated).toBe(false);
    expect(store.isAdmin).toBe(false);
    expect(store.user).toBeNull();
    expect(store.token).toBeNull();
    expect(getStoredToken()).toBeNull();
  });

  it('restores auth session on initAuth when stored token is valid', async () => {
    setStoredToken('existing-valid-token');
    const store = useAuthStore();

    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      userId: 'user-001',
      role: 'owner',
      displayName: 'Owner User',
    });

    await store.initAuth();

    expect(store.isAuthenticated).toBe(true);
    expect(store.isAdmin).toBe(true);
    expect(store.user?.role).toBe('owner');
  });

  it('clears stored token when initAuth encounters 401 Unauthorized', async () => {
    setStoredToken('expired-token');
    const store = useAuthStore();

    vi.spyOn(apiClient, 'get').mockRejectedValueOnce(new UnauthorizedError('凭证已过期'));

    await store.initAuth();

    expect(store.isAuthenticated).toBe(false);
    expect(store.token).toBeNull();
    expect(store.user).toBeNull();
    expect(getStoredToken()).toBeNull();
  });
});
