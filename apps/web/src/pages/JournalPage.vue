<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/60 pb-5">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <BookOpenIcon class="w-7 h-7 text-amber-400" />
          <span>随想日记</span>
        </h1>
        <p class="mt-1 text-sm text-slate-400">
          Markdown 富文本札记、心情感知与生活随感
        </p>
      </div>

      <!-- Admin write actions (hidden for guests) -->
      <div v-if="authStore.isAdmin" class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 shadow-md transition-colors"
        >
          <PenSquareIcon class="w-4 h-4" />
          <span>撰写日记</span>
        </button>
      </div>
    </div>

    <!-- Journal Cards Placeholder -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="i in 4"
        :key="i"
        class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm transition-all hover:border-slate-700"
      >
        <div class="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span class="text-amber-400">✨ 晴朗 / 心情畅快</span>
          <span class="font-mono">2026.11.19</span>
        </div>
        <h3 class="text-base font-semibold text-white">时光随笔 #{{ i }}</h3>
        <p class="mt-2 text-xs text-slate-400 line-clamp-2">
          在这个数字化急速演进的时代，搭建一套完全受控、自主持久的个人档案中心，是最具仪式感的事情...
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BookOpen as BookOpenIcon, PenSquare as PenSquareIcon } from 'lucide-vue-next';
import { useAuthStore } from '@/features/auth/stores/auth.store';

const authStore = useAuthStore();
</script>
