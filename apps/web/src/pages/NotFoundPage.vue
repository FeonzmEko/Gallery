<template>
  <div class="gallery-reveal flex flex-col items-center justify-center min-h-[62vh] text-center px-6 py-16">
    <div class="w-[1px] h-12 bg-[#C4BBA9] mb-6"></div>
    <div class="font-display italic text-7xl sm:text-8xl font-light text-[#C4BBA9] leading-none">
      404
    </div>
    <h2 class="mt-6 font-serif text-2xl font-light tracking-[0.08em] text-[#161513]">
      未检得此卷档案
    </h2>
    <p class="mt-3 text-xs text-[#787268] max-w-sm leading-[1.9] font-light">
      该页已从展馆目录中移去，或从未被编入卷宗。您可以返回时光纪流继续阅览。
    </p>
    <RouterLink
      to="/"
      class="mt-8 inline-flex items-center gap-2 rounded-[2px] border border-[#161513] px-6 py-2.5 text-xs font-serif tracking-[0.18em] text-[#161513] hover:bg-[#161513] hover:text-[#FAF8F4] transition-colors"
    >
      返回展馆主厅
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>
