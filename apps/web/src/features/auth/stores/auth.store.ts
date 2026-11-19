import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  type AuthUser,
  type AuthSession,
  hasAdminPrivileges,
  UnauthorizedError,
} from '@archive/contracts';
import {
  apiClient,
  getStoredToken,
  setStoredToken,
  onUnauthorized,
} from '@/shared/api/client';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(getStoredToken());
  const user = ref<AuthUser | null>(null);
  const isLoading = ref<boolean>(false);
  const isInitialized = ref<boolean>(false);
  const error = ref<string | null>(null);
  const isLoginModalOpen = ref<boolean>(false);

  const isAuthenticated = computed<boolean>(() => !!token.value && !!user.value);
  const isAdmin = computed<boolean>(() => hasAdminPrivileges(user.value?.role));

  function openLoginModal(): void {
    isLoginModalOpen.value = true;
    error.value = null;
  }

  function closeLoginModal(): void {
    isLoginModalOpen.value = false;
    error.value = null;
  }

  function toggleLoginModal(): void {
    if (isLoginModalOpen.value) {
      closeLoginModal();
    } else {
      openLoginModal();
    }
  }

  /**
   * Admin login action.
   * Can accept either just password (defaults to admin email) or custom email + password.
   */
  async function login(password: string, email: string = 'admin@archive.internal'): Promise<AuthUser> {
    isLoading.value = true;
    error.value = null;
    try {
      const session = await apiClient.post<AuthSession>('/api/v1/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });

      token.value = session.token;
      user.value = session.user;
      setStoredToken(session.token);
      closeLoginModal();
      return session.user;
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : '登录失败，请检查密码';
      error.value = msg;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Clears state locally without throwing.
   */
  function clearAuth(): void {
    token.value = null;
    user.value = null;
    setStoredToken(null);
  }

  /**
   * Log out session.
   */
  async function logout(): Promise<void> {
    isLoading.value = true;
    try {
      if (token.value) {
        await apiClient.post('/api/v1/auth/logout').catch(() => {});
      }
    } finally {
      clearAuth();
      isLoading.value = false;
    }
  }

  /**
   * Initialize and restore authentication on app boot.
   */
  async function initAuth(): Promise<void> {
    if (isInitialized.value) return;
    const stored = getStoredToken();
    if (!stored) {
      isInitialized.value = true;
      return;
    }

    token.value = stored;
    try {
      const profile = await apiClient.get<AuthUser>('/api/v1/auth/me');
      user.value = profile;
    } catch (err) {
      // If token expired or invalid, reset
      if (err instanceof UnauthorizedError) {
        clearAuth();
      }
    } finally {
      isInitialized.value = true;
    }
  }

  // Bind 401 callback to reset state
  onUnauthorized(() => {
    clearAuth();
  });

  return {
    token,
    user,
    isLoading,
    isInitialized,
    error,
    isLoginModalOpen,
    isAuthenticated,
    isAdmin,
    openLoginModal,
    closeLoginModal,
    toggleLoginModal,
    login,
    logout,
    initAuth,
    clearAuth,
  };
});
