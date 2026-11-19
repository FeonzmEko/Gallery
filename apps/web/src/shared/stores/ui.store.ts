import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export type QuickCreateTarget = 'entry' | 'photo' | 'journal' | 'trip';

export const useUiStore = defineStore('ui', () => {
  const toasts = ref<ToastItem[]>([]);
  let nextToastId = 1;

  const confirmState = ref<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    danger: boolean;
  }>({
    open: false,
    title: '',
    message: '',
    confirmLabel: '确认',
    cancelLabel: '取消',
    danger: false,
  });

  let confirmResolver: ((ok: boolean) => void) | null = null;

  const isQuickMenuOpen = ref(false);
  const pendingAction = ref<QuickCreateTarget | null>(null);

  function addToast(message: string, variant: ToastVariant = 'info', durationMs = 3600): void {
    const id = nextToastId++;
    toasts.value.push({ id, message, variant });
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        dismissToast(id);
      }, durationMs);
    }
  }

  function dismissToast(id: number): void {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  function notifySuccess(message: string): void {
    addToast(message, 'success');
  }

  function notifyError(message: string): void {
    addToast(message, 'error', 5000);
  }

  function notifyInfo(message: string): void {
    addToast(message, 'info');
  }

  function confirm(options: ConfirmOptions): Promise<boolean> {
    if (confirmResolver) {
      confirmResolver(false);
      confirmResolver = null;
    }
    confirmState.value = {
      open: true,
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel ?? '确认',
      cancelLabel: options.cancelLabel ?? '取消',
      danger: options.danger ?? false,
    };
    return new Promise<boolean>((resolve) => {
      confirmResolver = resolve;
    });
  }

  function resolveConfirm(accepted: boolean): void {
    confirmState.value.open = false;
    if (confirmResolver) {
      const resolve = confirmResolver;
      confirmResolver = null;
      resolve(accepted);
    }
  }

  function triggerQuickAction(action: QuickCreateTarget): void {
    pendingAction.value = action;
    isQuickMenuOpen.value = false;
  }

  function consumeQuickAction(expected?: QuickCreateTarget): QuickCreateTarget | null {
    const current = pendingAction.value;
    if (!current) return null;
    if (expected && current !== expected) return null;
    pendingAction.value = null;
    return current;
  }

  return {
    toasts,
    confirmState,
    isQuickMenuOpen,
    pendingAction,
    notifySuccess,
    notifyError,
    notifyInfo,
    dismissToast,
    confirm,
    resolveConfirm,
    triggerQuickAction,
    consumeQuickAction,
  };
});
