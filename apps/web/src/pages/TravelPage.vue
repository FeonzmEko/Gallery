<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/60 pb-5">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <CompassIcon class="w-7 h-7 text-indigo-400" />
          <span>足迹漫游</span>
        </h1>
        <p class="mt-1 text-sm text-slate-400">
          基于 Leaflet + OpenStreetMap 免费瓦片的地理足迹与旅行轨迹
        </p>
      </div>

      <!-- Admin write actions (hidden for guests) -->
      <div v-if="authStore.isAdmin" class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-indigo-400 shadow-md transition-colors"
        >
          <MapPinPlusIcon class="w-4 h-4" />
          <span>标记新足迹</span>
        </button>
      </div>
    </div>

    <!-- Travel Map Placeholder -->
    <div class="relative h-96 w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col items-center justify-center text-slate-500">
      <CompassIcon class="w-12 h-12 text-indigo-400/50 mb-3 animate-pulse" />
      <span class="text-sm font-medium text-slate-300">Leaflet + OSM 足迹地图画卷就绪</span>
      <span class="text-xs text-slate-500 mt-1">零商业 API Key，完全开源自主</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Compass as CompassIcon, MapPinPlus as MapPinPlusIcon } from 'lucide-vue-next';
import { useAuthStore } from '@/features/auth/stores/auth.store';

const authStore = useAuthStore();
</script>
