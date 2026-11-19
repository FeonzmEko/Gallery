<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="authStore.isLoginModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
      >
        <!-- Backdrop -->
        <div
          class="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
          @click="authStore.closeLoginModal"
        ></div>

        <!-- Modal Dialog -->
        <div
          class="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl transition-all"
        >
          <!-- Subtle glow effect at top -->
          <div
            class="absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl pointer-events-none"
          ></div>

          <!-- Close button -->
          <button
            type="button"
            class="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500"
            @click="authStore.closeLoginModal"
            title="关闭 (Esc)"
          >
            <XIcon class="w-5 h-5" />
          </button>

          <!-- Header -->
          <div class="flex flex-col items-center text-center mb-6">
            <div
              class="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 mb-3 shadow-inner"
            >
              <LockIcon class="w-6 h-6" />
            </div>
            <h2 id="login-modal-title" class="text-xl font-bold tracking-tight text-white">
              管理员暗门认证
            </h2>
            <p class="mt-1 text-xs text-slate-400">
              请输入档案管理员密钥以解锁发布、编辑与直传权限
            </p>
          </div>

          <!-- Form -->
          <form @submit.prevent="handleSubmit" class="space-y-4">
            <!-- Optional Email Toggle or Input -->
            <div v-if="showCustomEmail" class="space-y-1">
              <label class="block text-xs font-medium text-slate-300">管理员账号 (Email)</label>
              <div class="relative">
                <input
                  v-model="email"
                  type="email"
                  placeholder="admin@archive.internal"
                  class="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-colors"
                  autocomplete="username"
                  required
                />
              </div>
            </div>

            <!-- Password Input -->
            <div class="space-y-1">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-medium text-slate-300">管理员密钥</label>
                <button
                  type="button"
                  class="text-[11px] text-slate-400 hover:text-sky-400 transition-colors"
                  @click="showCustomEmail = !showCustomEmail"
                >
                  {{ showCustomEmail ? '使用默认账号' : '切换自定义账号' }}
                </button>
              </div>
              <div class="relative">
                <input
                  ref="passwordInputRef"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="••••••••••••"
                  class="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 pr-10 text-sm text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-colors"
                  autocomplete="current-password"
                  required
                />
                <button
                  type="button"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition-colors"
                  @click="showPassword = !showPassword"
                >
                  <EyeOffIcon v-if="showPassword" class="w-4 h-4" />
                  <EyeIcon v-else class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Error Feedback -->
            <div
              v-if="errorMessage"
              class="rounded-lg bg-red-950/50 border border-red-800/60 px-3 py-2 text-xs text-red-300 flex items-center gap-2"
            >
              <AlertCircleIcon class="w-4 h-4 shrink-0 text-red-400" />
              <span>{{ errorMessage }}</span>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              :disabled="isLoading || !password.trim()"
              class="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-md transition-all hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Loader2Icon v-if="isLoading" class="w-4 h-4 animate-spin" />
              <span>{{ isLoading ? '验证授权中...' : '确认进入管理权限' }}</span>
            </button>
          </form>

          <!-- Footer hint -->
          <div class="mt-5 text-center">
            <span class="text-[11px] text-slate-500">
              提示: 可随时使用 <kbd class="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">Ctrl+Shift+L</kbd> 快捷键唤起暗门
            </span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import {
  X as XIcon,
  Lock as LockIcon,
  Eye as EyeIcon,
  EyeOff as EyeOffIcon,
  Loader2 as Loader2Icon,
  AlertCircle as AlertCircleIcon,
} from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth.store';

const authStore = useAuthStore();

const email = ref('admin@archive.internal');
const password = ref('');
const showPassword = ref(false);
const showCustomEmail = ref(false);
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);
const passwordInputRef = ref<HTMLInputElement | null>(null);

watch(
  () => authStore.isLoginModalOpen,
  (open) => {
    if (open) {
      password.value = '';
      errorMessage.value = null;
      showPassword.value = false;
      nextTick(() => {
        passwordInputRef.value?.focus();
      });
    }
  }
);

async function handleSubmit(): Promise<void> {
  if (!password.value.trim()) return;

  isLoading.value = true;
  errorMessage.value = null;

  try {
    await authStore.login(password.value, email.value);
  } catch (err: any) {
    errorMessage.value = err?.message || '授权验证失败，请确认密钥正确';
  } finally {
    isLoading.value = false;
  }
}

// Global hotkey handler (Ctrl+Shift+L / Cmd+Shift+L / Escape)
function handleKeydown(e: KeyboardEvent): void {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
    e.preventDefault();
    authStore.toggleLoginModal();
  } else if (e.key === 'Escape' && authStore.isLoginModalOpen) {
    authStore.closeLoginModal();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>
