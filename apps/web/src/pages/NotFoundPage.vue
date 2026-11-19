<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
    <div class="text-7xl font-extrabold text-[#D4CEBF] tracking-widest font-mono">
      404
    </div>
    <h2 class="mt-4 font-serif text-2xl font-medium text-[#1D1C1A]">未找到对应档案记录</h2>
    <p class="mt-2 text-sm text-[#747169] max-w-sm">
      该页面不存在或已被移除。您可以返回时光纪流主线。
    </p>
    <RouterLink
      to="/"
      class="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#C25438] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#A9442C] transition-colors shadow-sm"
    >
      返回时光主页
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>
