<template>
  <Teleport to="body">
    <div
      class="fixed top-20 right-4 left-4 sm:left-auto sm:w-96 z-[70] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
    >
      <TransitionGroup
        enter-active-class="transform ease-out duration-200 transition"
        enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-4"
        enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
        leave-active-class="transition ease-in duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-for="toast in uiStore.toasts"
          :key="toast.id"
          class="pointer-events-auto flex items-start gap-3 rounded-xl border bg-white/95 backdrop-blur-md p-3.5 shadow-lg text-xs"
          :class="borderClass(toast.variant)"
        >
          <CheckCircle2Icon
            v-if="toast.variant === 'success'"
            class="w-4 h-4 text-[#4E6053] shrink-0 mt-0.5"
          />
          <AlertCircleIcon
            v-else-if="toast.variant === 'error'"
            class="w-4 h-4 text-[#C25438] shrink-0 mt-0.5"
          />
          <InfoIcon v-else class="w-4 h-4 text-[#747169] shrink-0 mt-0.5" />

          <p class="flex-1 text-[#1D1C1A] leading-relaxed">{{ toast.message }}</p>

          <button
            type="button"
            class="text-[#9E9B93] hover:text-[#1D1C1A] transition-colors shrink-0"
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
import {
  CheckCircle2 as CheckCircle2Icon,
  AlertCircle as AlertCircleIcon,
  Info as InfoIcon,
  X as XIcon,
} from 'lucide-vue-next';
import { useUiStore, type ToastVariant } from '@/shared/stores/ui.store';

const uiStore = useUiStore();

function borderClass(variant: ToastVariant): string {
  if (variant === 'success') return 'border-[#4E6053]/30';
  if (variant === 'error') return 'border-[#C25438]/40 bg-[#FDF8F6]/95';
  return 'border-[#E5E1D8]';
}
</script>
