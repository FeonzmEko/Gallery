<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/60 pb-5">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <ClockIcon class="w-7 h-7 text-sky-400" />
          <span>时光纪流</span>
        </h1>
        <p class="mt-1 text-sm text-slate-400">
          以真实记忆发生时间（occurred_at）为刻度的全局生命流
        </p>
      </div>

      <!-- Admin write actions (hidden for guests) -->
      <div v-if="authStore.isAdmin" class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 shadow-md transition-colors"
        >
          <PlusIcon class="w-4 h-4" />
          <span>记录此刻</span>
        </button>
      </div>
    </div>

    <!-- Timeline Content Placeholder / Preview -->
    <div class="relative pl-6 sm:pl-8 border-l border-slate-800 space-y-8">
      <div class="relative group">
        <!-- Milestone Dot -->
        <div class="absolute -left-[31px] sm:-left-[39px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 border-2 border-sky-400 shadow"></div>
        <div class="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm transition-all hover:border-slate-700">
          <div class="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span class="font-mono text-sky-400">2026 年 11 月</span>
            <span class="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">系统架构初始完成</span>
          </div>
          <h3 class="text-lg font-semibold text-white">个人数字记忆长廊 (Personal Archive) 架构落地</h3>
          <p class="mt-2 text-sm text-slate-300 leading-relaxed">
            模块化单体与 Cloudflare 全栈架构已完成装配。访客公开只读与管理员密钥暗门授权已生效。
          </p>
          <div v-if="authStore.isAdmin" class="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2">
            <span class="text-xs text-amber-400 flex items-center gap-1">
              <ShieldCheckIcon class="w-3.5 h-3.5" />
              管理员专属编辑入口已就绪
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Clock as ClockIcon, Plus as PlusIcon, ShieldCheck as ShieldCheckIcon } from 'lucide-vue-next';
import { useAuthStore } from '@/features/auth/stores/auth.store';

const authStore = useAuthStore();
</script>
