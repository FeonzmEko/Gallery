<template>
  <Teleport to="body">
    <div
      class="fixed top-20 right-5 left-5 sm:left-auto sm:w-96 z-[70] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
    >
      <TransitionGroup
        enter-active-class="transform ease-gallery duration-250 transition"
        enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-4"
        enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
        leave-active-class="transition ease-in duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-for="toast in uiStore.toasts"
          :key="toast.id"
          class="pointer-events-auto flex items-start gap-3 rounded-[2px] border bg-[#FAF8F4]/98 backdrop-blur-md p-4 shadow-[0_18px_40px_-16px_rgba(22,21,19,0.28)] text-xs"
          :class="borderClass(toast.variant)"
        >
          <span
            class="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
            :class="dotClass(toast.variant)"
          ></span>

          <p class="flex-1 font-serif text-[#161513] leading-relaxed">{{ toast.message }}</p>

          <button
            type="button"
            class="text-[#9B9488] hover:text-[#161513] transition-colors shrink-0"
            @click="uiStore.dismissToast(toast.id)"
            aria-label="关闭通知"
          >
            <XIcon class="w-3.5 h-3.5" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { X as XIcon } from 'lucide-vue-next';
import { useUiStore, type ToastVariant } from '@/shared/stores/ui.store';

const uiStore = useUiStore();

function borderClass(variant: ToastVariant): string {
  if (variant === 'success') return 'border-[#3D4E42]/45';
  if (variant === 'error') return 'border-[#9A3F2B]/55 bg-[#FAF4F2]/98';
  return 'border-[#DDD6C9]';
}

function dotClass(variant: ToastVariant): string {
  if (variant === 'success') return 'bg-[#3D4E42]';
  if (variant === 'error') return 'bg-[#9A3F2B]';
  return 'bg-[#161513]';
}
</script>
