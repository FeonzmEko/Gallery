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
          class="fixed inset-0 bg-[#1D1C1A]/40 backdrop-blur-xs"
          @click="uiStore.resolveConfirm(false)"
        ></div>
        <div
          class="relative w-full max-w-sm rounded-2xl border border-[#E5E1D8] bg-[#F7F5F0] p-6 shadow-2xl space-y-4"
        >
          <div class="space-y-1.5">
            <h3 class="font-serif text-lg font-medium text-[#1D1C1A]">
              {{ uiStore.confirmState.title }}
            </h3>
            <p class="text-xs text-[#747169] leading-relaxed">
              {{ uiStore.confirmState.message }}
            </p>
          </div>
          <div class="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              class="px-4 py-2 rounded-xl text-xs font-medium text-[#747169] hover:text-[#1D1C1A] hover:bg-[#EFECE4] transition-colors"
              @click="uiStore.resolveConfirm(false)"
            >
              {{ uiStore.confirmState.cancelLabel }}
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition-colors"
              :class="
                uiStore.confirmState.danger
                  ? 'bg-[#C25438] hover:bg-[#A9442C]'
                  : 'bg-[#1D1C1A] hover:bg-[#3A3834]'
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
