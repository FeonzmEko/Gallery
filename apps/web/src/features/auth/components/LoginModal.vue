<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-gallery"
      enter-from-class="opacity-0 scale-98"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-98"
    >
      <div
        v-if="authStore.isLoginModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
      >
        <div
          class="fixed inset-0 bg-[#161513]/55 backdrop-blur-xs transition-opacity"
          @click="authStore.closeLoginModal"
        ></div>

        <div
          class="relative w-full max-w-md overflow-hidden rounded-[2px] border border-[#DDD6C9] bg-[#FAF8F4] p-8 sm:p-10 shadow-[0_32px_80px_-20px_rgba(22,21,19,0.45)] transition-all"
        >
          <button
            type="button"
            class="absolute top-5 right-5 p-1.5 text-[#787268] hover:text-[#161513] transition-colors focus:outline-none"
            @click="authStore.closeLoginModal"
            title="关闭 (Esc)"
          >
            <XIcon class="w-4 h-4" />
          </button>

          <!-- Architectural Seal Header -->
          <div class="flex flex-col items-center text-center mb-8">
            <div class="relative w-10 h-10 flex items-center justify-center mb-5">
              <span class="absolute inset-0 border border-[#161513]"></span>
              <span class="absolute inset-[5px] border border-[#DDD6C9]"></span>
              <span class="w-1.5 h-1.5 rounded-full bg-[#9A3F2B]"></span>
            </div>
            <span class="kicker-caps text-[#9A3F2B] mb-2">CURATOR GATEWAY</span>
            <h2 id="login-modal-title" class="font-serif text-2xl font-light tracking-[0.06em] text-[#161513]">
              馆长暗门认证
            </h2>
            <p class="mt-2 text-xs text-[#787268] font-light">
              输入档案馆密钥以解锁发布、修订与影像直传权限
            </p>
          </div>

          <form @submit.prevent="handleSubmit" class="space-y-5">
            <div v-if="showCustomEmail" class="space-y-1.5">
              <label class="block kicker-caps text-[#787268]">管理员账号</label>
              <input
                v-model="email"
                type="email"
                placeholder="admin@archive.internal"
                class="w-full editorial-field px-3.5 py-2.5 text-sm"
                autocomplete="username"
                required
              />
            </div>

            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label class="block kicker-caps text-[#787268]">管理员密钥</label>
                <button
                  type="button"
                  class="text-[11px] font-mono text-[#787268] hover:text-[#9A3F2B] transition-colors"
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
                  class="w-full editorial-field px-3.5 py-2.5 pr-10 text-sm"
                  autocomplete="current-password"
                  required
                />
                <button
                  type="button"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#9B9488] hover:text-[#161513] transition-colors"
                  @click="showPassword = !showPassword"
                >
                  <EyeOffIcon v-if="showPassword" class="w-4 h-4" />
                  <EyeIcon v-else class="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              v-if="errorMessage"
              class="rounded-[2px] bg-[#FAF4F2] border border-[#9A3F2B]/35 px-3.5 py-2.5 text-xs text-[#9A3F2B] flex items-center gap-2"
            >
              <AlertCircleIcon class="w-4 h-4 shrink-0" />
              <span>{{ errorMessage }}</span>
            </div>

            <button
              type="submit"
              :disabled="isLoading || !password.trim()"
              class="w-full flex items-center justify-center gap-2 rounded-[2px] bg-[#161513] px-4 py-3 text-xs font-serif tracking-[0.2em] text-[#FAF8F4] transition-colors hover:bg-[#9A3F2B] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Loader2Icon v-if="isLoading" class="w-4 h-4 animate-spin" />
              <span>{{ isLoading ? '验证授权中...' : '解锁策展权限' }}</span>
            </button>
          </form>

          <div class="mt-6 pt-5 border-t border-[#E8E2D6] text-center">
            <span class="text-[11px] text-[#787268]">
              快捷键 <kbd class="px-1.5 py-0.5 rounded-[2px] bg-[#F3EFE7] border border-[#DDD6C9] text-[#161513] font-mono text-[10px]">Ctrl+Shift+L</kbd> 可随时唤起暗门
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
