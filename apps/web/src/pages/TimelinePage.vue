<template>
  <div class="space-y-8">
    <!-- Page Header & Action Bar -->
    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-[#E5E1D8] pb-6">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="text-[11px] font-mono tracking-widest text-[#C25438] uppercase font-semibold">CHRONICLE INDEX</span>
          <span class="text-[#D4CEBF]">&middot;</span>
          <span class="text-[11px] font-mono text-[#9E9B93]">OCCURRED AT 排序</span>
        </div>
        <h1 class="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-[#1D1C1A] flex items-center gap-3">
          <span>时光纪流</span>
        </h1>
        <p class="mt-1 text-sm text-[#747169] font-serif italic">
          “将那些散落于岁月中的光斑，逐一抚平并妥善归档。”
        </p>
      </div>

      <!-- Action Area -->
      <div class="flex items-center gap-3">
        <!-- Live Search Input -->
        <div class="relative">
          <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9E9B93]" />
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="检索时光记忆与标签..."
            class="w-48 sm:w-64 rounded-xl bg-white border border-[#E5E1D8] pl-9 pr-3 py-2 text-xs text-[#1D1C1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#C25438]/50 focus:ring-1 focus:ring-[#C25438]/30 transition-all shadow-sm"
            @input="handleSearchDebounced"
          />
        </div>

        <!-- Admin write action -->
        <button
          v-if="authStore.isAdmin"
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-[#C25438] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A9442C] shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          @click="openCreateModal"
        >
          <PlusIcon class="w-3.5 h-3.5" />
          <span>记录此刻</span>
        </button>
      </div>
    </div>

    <!-- Filter & Year Scale Ruler -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 py-3 border-b border-[#E5E1D8]/70">
      <!-- Category Tabs (全部 / 旅行 / 日记 / 照片) -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
        <button
          v-for="cat in categories"
          :key="cat.value"
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          :class="[
            selectedCategory === cat.value
              ? 'bg-white text-[#1D1C1A] font-semibold border border-[#E5E1D8] shadow-sm'
              : 'text-[#747169] hover:text-[#1D1C1A] hover:bg-[#EFECE4] border border-transparent',
          ]"
          @click="selectCategory(cat.value)"
        >
          <component
            :is="cat.icon"
            class="w-3.5 h-3.5"
            :class="selectedCategory === cat.value ? 'text-[#C25438]' : 'text-[#9E9B93]'"
          />
          <span>{{ cat.label }}</span>
        </button>
      </div>

      <!-- Year Scale Ruler (快速定位年份) -->
      <div v-if="availableYears.length > 0" class="flex items-center gap-1 text-xs text-[#747169]">
        <span class="text-[11px] font-mono mr-1 text-[#9E9B93]">年份刻度:</span>
        <button
          type="button"
          class="px-2 py-0.5 rounded-md text-xs font-mono transition-colors"
          :class="selectedYear === null ? 'bg-white text-[#C25438] font-bold border border-[#E5E1D8] shadow-xs' : 'hover:text-[#1D1C1A]'"
          @click="selectedYear = null"
        >
          全部
        </button>
        <button
          v-for="year in availableYears"
          :key="year"
          type="button"
          class="px-2 py-0.5 rounded-md text-xs font-mono transition-colors"
          :class="selectedYear === year ? 'bg-white text-[#C25438] font-bold border border-[#E5E1D8] shadow-xs' : 'hover:text-[#1D1C1A]'"
          @click="selectedYear = year"
        >
          {{ year }}
        </button>
      </div>
    </div>

    <!-- Timeline Main Stream -->
    <div class="relative pl-6 sm:pl-8 border-l border-[#E5E1D8] space-y-8 my-6">
      <!-- Loading Skeletons -->
      <div v-if="isLoading && entries.length === 0" class="space-y-6">
        <div
          v-for="i in 3"
          :key="i"
          class="rounded-2xl border border-[#E5E1D8] bg-white p-6 animate-pulse space-y-3"
        >
          <div class="h-4 bg-[#EFECE4] rounded w-1/4"></div>
          <div class="h-6 bg-[#EFECE4] rounded w-1/2"></div>
          <div class="h-14 bg-[#EFECE4]/60 rounded w-full"></div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="filteredEntries.length === 0"
        class="rounded-2xl border border-dashed border-[#D4CEBF] bg-white/60 p-12 text-center"
      >
        <ClockIcon class="w-10 h-10 text-[#9E9B93] mx-auto mb-3" />
        <h4 class="font-serif text-base font-medium text-[#1D1C1A]">暂无时间线记忆</h4>
        <p class="mt-1 text-xs text-[#747169] max-w-sm mx-auto">
          {{ searchKeyword ? '没有找到符合搜索条件的条目。' : '还没有记录任何历史足迹，点击上方“记录此刻”开始书写。' }}
        </p>
        <button
          v-if="authStore.isAdmin && !searchKeyword"
          type="button"
          class="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#C25438] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A9442C] transition-colors"
          @click="openCreateModal"
        >
          <PlusIcon class="w-3.5 h-3.5" />
          <span>写下第一篇时光记录</span>
        </button>
      </div>

      <!-- Timeline Entries Stream -->
      <div v-else class="space-y-8">
        <TimelineCard
          v-for="entry in filteredEntries"
          :key="entry.id"
          :entry="entry"
          :is-admin="authStore.isAdmin"
          @edit="handleEditEntry"
          @delete="handleDeleteEntry"
        />
      </div>

      <!-- Cursor Pagination: Load More Button -->
      <div v-if="hasMore" class="pt-6 text-center">
        <button
          type="button"
          :disabled="isLoadingMore"
          class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white hover:bg-[#F7F5F0] border border-[#E5E1D8] hover:border-[#D4CEBF] text-xs font-medium text-[#1D1C1A] shadow-sm transition-all disabled:opacity-50"
          @click="loadMore"
        >
          <Loader2Icon v-if="isLoadingMore" class="w-3.5 h-3.5 animate-spin text-[#C25438]" />
          <span>{{ isLoadingMore ? '正在溯流历史...' : '向下溯流更多历史记忆' }}</span>
        </button>
      </div>
    </div>

    <!-- Create / Edit Entry Modal -->
    <CreateEntryModal
      v-model="isModalOpen"
      :editing-entry="editingEntry"
      @saved="handleEntrySaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  Clock as ClockIcon,
  Plus as PlusIcon,
  Search as SearchIcon,
  Compass as CompassIcon,
  BookOpen as BookOpenIcon,
  Camera as CameraIcon,
  Layers as LayersIcon,
  Loader2 as Loader2Icon,
} from 'lucide-vue-next';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { apiClient } from '@/shared/api/client';
import TimelineCard from '@/features/timeline/components/TimelineCard.vue';
import CreateEntryModal from '@/features/timeline/components/CreateEntryModal.vue';
import type { EntryDto } from '@archive/contracts';

const authStore = useAuthStore();

const categories = [
  { label: '全部时光', value: 'all', icon: LayersIcon },
  { label: '旅行足迹', value: 'trip', icon: CompassIcon },
  { label: '随想手札', value: 'journal', icon: BookOpenIcon },
  { label: '摄影长廊', value: 'photo', icon: CameraIcon },
];

const selectedCategory = ref('all');
const selectedYear = ref<number | null>(null);
const searchKeyword = ref('');

const entries = ref<EntryDto[]>([]);
const nextCursor = ref<string | null>(null);
const hasMore = ref(false);
const isLoading = ref(true);
const isLoadingMore = ref(false);

const isModalOpen = ref(false);
const editingEntry = ref<EntryDto | null>(null);

// Extract unique years from entries for Year Scale Ruler
const availableYears = computed(() => {
  const yearsSet = new Set<number>();
  for (const item of entries.value) {
    if (item.occurredAt) {
      yearsSet.add(new Date(item.occurredAt).getFullYear());
    }
  }
  return Array.from(yearsSet).sort((a, b) => b - a);
});

// Client-side filtering (year + category + search keyword)
const filteredEntries = computed(() => {
  return entries.value.filter((item) => {
    // 1. Year filter
    if (selectedYear.value !== null) {
      const yr = new Date(item.occurredAt).getFullYear();
      if (yr !== selectedYear.value) return false;
    }

    // 2. Category filter
    if (selectedCategory.value !== 'all' && item.type !== selectedCategory.value) {
      return false;
    }

    // 3. Keyword filter
    if (searchKeyword.value.trim()) {
      const q = searchKeyword.value.trim().toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSummary = (item.summary || '').toLowerCase().includes(q);
      const matchTags = (item.tags || []).some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchSummary && !matchTags) return false;
    }

    return true;
  });
});

let searchTimeout: any = null;
function handleSearchDebounced() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadTimeline(true);
  }, 350);
}

function selectCategory(cat: string) {
  selectedCategory.value = cat;
  loadTimeline(true);
}

async function loadTimeline(reset: boolean = false) {
  if (reset) {
    isLoading.value = true;
    nextCursor.value = null;
  } else {
    isLoadingMore.value = true;
  }

  try {
    const params: Record<string, any> = {
      limit: 20,
    };

    if (selectedCategory.value !== 'all') {
      params.type = selectedCategory.value;
    }

    if (searchKeyword.value.trim()) {
      params.search = searchKeyword.value.trim();
    }

    if (!reset && nextCursor.value) {
      params.cursor = nextCursor.value;
    }

    const res = await apiClient.request<{
      data: EntryDto[];
      meta?: { pagination?: { cursor: string | null; hasMore: boolean } };
    }>('/api/v1/entries', {
      params,
    });

    const newItems = Array.isArray(res) ? res : res.data || [];
    const pagination = (res as any).meta?.pagination;

    if (reset) {
      entries.value = newItems;
    } else {
      entries.value = [...entries.value, ...newItems];
    }

    nextCursor.value = pagination?.cursor ?? null;
    hasMore.value = pagination?.hasMore ?? false;
  } catch (err) {
    console.error('Failed to load timeline entries:', err);
  } finally {
    isLoading.value = false;
    isLoadingMore.value = false;
  }
}

function loadMore() {
  if (hasMore.value && !isLoadingMore.value) {
    loadTimeline(false);
  }
}

function openCreateModal() {
  editingEntry.value = null;
  isModalOpen.value = true;
}

function handleEditEntry(entry: EntryDto) {
  editingEntry.value = entry;
  isModalOpen.value = true;
}

async function handleDeleteEntry(id: string) {
  if (!confirm('确认删除此条记忆吗？此操作无法撤销。')) return;

  try {
    await apiClient.delete(`/api/v1/entries/${id}`);
    entries.value = entries.value.filter((e) => e.id !== id);
  } catch (err: any) {
    alert(err.message || '删除失败');
  }
}

function handleEntrySaved(_saved: EntryDto) {
  loadTimeline(true);
}

onMounted(() => {
  loadTimeline(true);
});
</script>
