<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/60 pb-5">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <ImageIcon class="w-7 h-7 text-emerald-400" />
          <span>媒体长廊</span>
        </h1>
        <p class="mt-1 text-sm text-slate-400">
          全网格自适应瀑布流与大图灯箱预览（支持 EXIF 与缩略图快速分发）
        </p>
      </div>

      <!-- Admin write actions (hidden for guests) -->
      <div v-if="authStore.isAdmin" class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 shadow-md transition-colors"
        >
          <UploadCloudIcon class="w-4 h-4" />
          <span>并发直传 R2</span>
        </button>
      </div>
    </div>

    <!-- Media Grid Placeholder -->
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      <div
        v-for="i in 8"
        :key="i"
        class="group relative aspect-square overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 flex flex-col items-center justify-center text-slate-600 transition-all hover:border-slate-700 hover:scale-[1.02]"
      >
        <ImageIcon class="w-8 h-8 group-hover:text-emerald-400 transition-colors" />
        <span class="mt-2 text-xs text-slate-500">画廊切片 #{{ i }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Image as ImageIcon, UploadCloud as UploadCloudIcon } from 'lucide-vue-next';
import { useAuthStore } from '@/features/auth/stores/auth.store';

const authStore = useAuthStore();
</script>
