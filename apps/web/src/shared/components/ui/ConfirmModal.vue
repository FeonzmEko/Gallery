<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="uiStore.confirmState.open"
        class="fixed inset-0 z-[80] flex items-center justify-center p-4"
        role="alertdialog"
        aria-modal="true"
      >
        <div
          class="fixed inset-0 bg-[#161513]/55 backdrop-blur-xs"
          @click="uiStore.resolveConfirm(false)"
        ></div>
        <div
          class="relative w-full max-w-sm rounded-[2px] border border-[#DDD6C9] bg-[#FAF8F4] p-7 shadow-2xl space-y-5"
        >
          <div class="space-y-2">
            <span class="kicker-caps text-[#9A3F2B] block">CONFIRMATION</span>
            <h3 class="font-serif text-xl font-normal text-[#161513]">
              {{ uiStore.confirmState.title }}
            </h3>
            <p class="text-xs text-[#57534C] leading-[1.85] font-light">
              {{ uiStore.confirmState.message }}
            </p>
          </div>
          <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#E8E2D6]">
            <button
              type="button"
              class="px-4 py-2 text-xs font-serif tracking-wider text-[#787268] hover:text-[#161513] transition-colors"
              @click="uiStore.resolveConfirm(false)"
            >
              {{ uiStore.confirmState.cancelLabel }}
            </button>
            <button
              type="button"
              class="px-5 py-2 rounded-[2px] text-xs font-serif tracking-[0.14em] text-[#FAF8F4] transition-colors"
              :class="
                uiStore.confirmState.danger
                  ? 'bg-[#9A3F2B] hover:bg-[#7E3120]'
                  : 'bg-[#161513] hover:bg-[#3A3834]'
              "
              @click="uiStore.resolveConfirm(true)"
            >
              {{ uiStore.confirmState.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useUiStore } from '@/shared/stores/ui.store';

const uiStore = useUiStore();
</script>
