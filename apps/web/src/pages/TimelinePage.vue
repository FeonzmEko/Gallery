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
        <h1 class="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-[#1D1C1A]">
          时光纪流
        </h1>
        <p class="mt-1 text-sm text-[#747169] font-serif italic">
          “将那些散落于岁月中的光斑，逐一抚平并妥善归档。”
        </p>
      </div>

      <!-- Search, Layout Switcher & Admin Create -->
      <div class="flex flex-wrap items-center gap-2.5">
        <div class="relative">
          <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9E9B93]" />
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="检索时光记忆与标签..."
            class="w-48 sm:w-56 rounded-xl bg-white border border-[#E5E1D8] pl-9 pr-3 py-2 text-xs text-[#1D1C1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#C25438]/50 focus:ring-1 focus:ring-[#C25438]/30 transition-all shadow-xs"
            @input="handleSearchDebounced"
          />
        </div>

        <!-- Bento / Spine View Mode Switcher -->
        <div class="inline-flex rounded-xl bg-[#EFECE4] p-1 border border-[#E5E1D8] text-xs">
          <button
            type="button"
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all"
            :class="viewMode === 'bento' ? 'bg-white text-[#1D1C1A] font-semibold shadow-xs' : 'text-[#747169] hover:text-[#1D1C1A]'"
            @click="viewMode = 'bento'"
            title="策展网格视图"
          >
            <LayoutGridIcon class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">策展</span>
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all"
            :class="viewMode === 'spine' ? 'bg-white text-[#1D1C1A] font-semibold shadow-xs' : 'text-[#747169] hover:text-[#1D1C1A]'"
            @click="viewMode = 'spine'"
            title="编年脊线视图"
          >
            <ListIcon class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">脊线</span>
          </button>
        </div>

        <button
          v-if="authStore.isAdmin"
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-[#C25438] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A9442C] shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
          @click="openCreateModal"
        >
          <PlusIcon class="w-3.5 h-3.5" />
          <span>记录此刻</span>
        </button>
      </div>
    </div>

    <!-- Filter Bar: Category Tabs + Year Scale Ruler + Active Tag -->
    <div class="space-y-3 border-b border-[#E5E1D8]/70 pb-4">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <!-- Category Tabs -->
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            v-for="cat in categories"
            :key="cat.value"
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0"
            :class="[
              selectedCategory === cat.value
                ? 'bg-white text-[#1D1C1A] font-semibold border border-[#E5E1D8] shadow-xs'
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

        <!-- Year Scale Ruler -->
        <div v-if="availableYears.length > 0" class="flex flex-wrap items-center gap-1 text-xs text-[#747169]">
          <span class="text-[11px] font-mono mr-1 text-[#9E9B93]">年份刻度:</span>
          <button
            type="button"
            class="px-2 py-0.5 rounded-md text-xs font-mono transition-colors"
            :class="selectedYear === null ? 'bg-white text-[#C25438] font-bold border border-[#E5E1D8] shadow-xs' : 'hover:text-[#1D1C1A]'"
            @click="selectYear(null)"
          >
            全部
          </button>
          <button
            v-for="year in availableYears"
            :key="year"
            type="button"
            class="px-2 py-0.5 rounded-md text-xs font-mono transition-colors"
            :class="selectedYear === year ? 'bg-white text-[#C25438] font-bold border border-[#E5E1D8] shadow-xs' : 'hover:text-[#1D1C1A]'"
            @click="selectYear(year)"
          >
            {{ year }}
          </button>
        </div>
      </div>

      <!-- Popular Tags Strip -->
      <div v-if="tags.length > 0 || selectedTag" class="flex flex-wrap items-center gap-1.5">
        <span class="text-[10px] font-mono text-[#9E9B93] mr-1">标签索引:</span>
        <button
          v-if="selectedTag"
          type="button"
          class="inline-flex items-center gap-1 rounded-full bg-[#C25438] text-white px-2.5 py-0.5 text-[11px] font-mono"
          @click="selectTag(null)"
        >
          <span>#{{ selectedTag }}</span>
          <XIcon class="w-3 h-3" />
        </button>
        <button
          v-for="tag in tags.slice(0, 12)"
          :key="tag.id"
          v-show="tag.name !== selectedTag"
          type="button"
          class="rounded-full bg-white hover:bg-[#EFECE4] border border-[#E5E1D8] px-2.5 py-0.5 text-[11px] font-mono text-[#747169] transition-colors"
          @click="selectTag(tag.name)"
        >
          #{{ tag.name }}
        </button>
      </div>
    </div>

    <!-- Loading Skeletons -->
    <div v-if="isLoading && entries.length === 0" class="grid grid-cols-1 md:grid-cols-12 gap-5">
      <div
        v-for="i in 4"
        :key="i"
        class="rounded-2xl border border-[#E5E1D8] bg-white p-6 animate-pulse space-y-3"
        :class="i === 1 ? 'md:col-span-8 h-64' : 'md:col-span-4 h-64'"
      >
        <div class="h-4 bg-[#EFECE4] rounded w-1/4"></div>
        <div class="h-6 bg-[#EFECE4] rounded w-1/2"></div>
        <div class="h-14 bg-[#EFECE4]/60 rounded w-full"></div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="entries.length === 0"
      class="rounded-2xl border border-dashed border-[#D4CEBF] bg-white/60 p-14 text-center"
    >
      <ClockIcon class="w-10 h-10 text-[#9E9B93] mx-auto mb-3" />
      <h4 class="font-serif text-base font-medium text-[#1D1C1A]">暂无时间线记忆</h4>
      <p class="mt-1 text-xs text-[#747169] max-w-sm mx-auto">
        {{ hasActiveFilter ? '没有找到符合当前筛选条件的条目，请尝试清除筛选条件。' : '还没有记录任何历史足迹，点击“记录此刻”开始书写。' }}
      </p>
      <div class="mt-4 flex items-center justify-center gap-3">
        <button
          v-if="hasActiveFilter"
          type="button"
          class="rounded-xl border border-[#E5E1D8] bg-white px-4 py-2 text-xs font-medium text-[#1D1C1A] hover:bg-[#F7F5F0]"
          @click="resetAllFilters"
        >
          重置筛选条件
        </button>
        <button
          v-if="authStore.isAdmin && !hasActiveFilter"
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-[#C25438] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A9442C] transition-colors"
          @click="openCreateModal"
        >
          <PlusIcon class="w-3.5 h-3.5" />
          <span>写下第一篇时光记录</span>
        </button>
      </div>
    </div>

    <!-- VIEW 1: BENTO CURATION GRID (Approved Hybrid Layout) -->
    <div v-else-if="viewMode === 'bento'" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
        <TimelineCard
          v-for="(entry, idx) in entries"
          :key="entry.id"
          :entry="entry"
          :is-admin="authStore.isAdmin"
          layout="bento"
          :featured="bentoSpanClass(entry, idx).includes('md:col-span-8')"
          :class="bentoSpanClass(entry, idx)"
          @select="openDetailModal"
          @edit="handleEditEntry"
          @delete="handleDeleteEntry"
          @tag-click="selectTag"
        />
      </div>

      <div v-if="hasMore" class="pt-4 text-center">
        <button
          type="button"
          :disabled="isLoadingMore"
          class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white hover:bg-[#F7F5F0] border border-[#E5E1D8] hover:border-[#D4CEBF] text-xs font-medium text-[#1D1C1A] shadow-xs transition-all disabled:opacity-50"
          @click="loadMore"
        >
          <Loader2Icon v-if="isLoadingMore" class="w-3.5 h-3.5 animate-spin text-[#C25438]" />
          <span>{{ isLoadingMore ? '正在溯流历史...' : '向下溯流更多历史记忆' }}</span>
        </button>
      </div>
    </div>

    <!-- VIEW 2: CHRONICLE SPINE (Linear Timeline) -->
    <div v-else class="relative pl-6 sm:pl-8 border-l border-[#E5E1D8] space-y-8 my-6">
      <TimelineCard
        v-for="entry in entries"
        :key="entry.id"
        :entry="entry"
        :is-admin="authStore.isAdmin"
        layout="spine"
        @select="openDetailModal"
        @edit="handleEditEntry"
        @delete="handleDeleteEntry"
        @tag-click="selectTag"
      />

      <div v-if="hasMore" class="pt-4 text-center">
        <button
          type="button"
          :disabled="isLoadingMore"
          class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white hover:bg-[#F7F5F0] border border-[#E5E1D8] hover:border-[#D4CEBF] text-xs font-medium text-[#1D1C1A] shadow-xs transition-all disabled:opacity-50"
          @click="loadMore"
        >
          <Loader2Icon v-if="isLoadingMore" class="w-3.5 h-3.5 animate-spin text-[#C25438]" />
          <span>{{ isLoadingMore ? '正在溯流历史...' : '向下溯流更多历史记忆' }}</span>
        </button>
      </div>
    </div>

    <!-- Entry Detail + Markdown/Map + Comments Modal -->
    <EntryDetailModal
      v-model="isDetailOpen"
      :entry="selectedEntry"
      :is-admin="authStore.isAdmin"
      @edit="handleEditEntry"
    />

    <!-- Create / Edit Entry Modal -->
    <CreateEntryModal
      v-model="isModalOpen"
      :editing-entry="editingEntry"
      @saved="handleEntrySaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import {
  Clock as ClockIcon,
  Plus as PlusIcon,
  Search as SearchIcon,
  Compass as CompassIcon,
  BookOpen as BookOpenIcon,
  Camera as CameraIcon,
  Layers as LayersIcon,
  Loader2 as Loader2Icon,
  LayoutGrid as LayoutGridIcon,
  List as ListIcon,
  X as XIcon,
} from 'lucide-vue-next';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { useUiStore } from '@/shared/stores/ui.store';
import { apiClient } from '@/shared/api/client';
import TimelineCard from '@/features/timeline/components/TimelineCard.vue';
import CreateEntryModal from '@/features/timeline/components/CreateEntryModal.vue';
import EntryDetailModal from '@/features/timeline/components/EntryDetailModal.vue';
import type { EntryDto, TagDto } from '@archive/contracts';

const authStore = useAuthStore();
const uiStore = useUiStore();

const categories = [
  { label: '全部时光', value: 'all', icon: LayersIcon },
  { label: '旅行足迹', value: 'trip', icon: CompassIcon },
  { label: '随想手札', value: 'journal', icon: BookOpenIcon },
  { label: '摄影胶片', value: 'photo', icon: CameraIcon },
];

const viewMode = ref<'bento' | 'spine'>('bento');
const selectedCategory = ref('all');
const selectedYear = ref<number | null>(null);
const selectedTag = ref<string | null>(null);
const searchKeyword = ref('');

const entries = ref<EntryDto[]>([]);
const availableYears = ref<number[]>([]);
const tags = ref<TagDto[]>([]);
const nextCursor = ref<string | null>(null);
const hasMore = ref(false);
const isLoading = ref(true);
const isLoadingMore = ref(false);

const isModalOpen = ref(false);
const editingEntry = ref<EntryDto | null>(null);

const isDetailOpen = ref(false);
const selectedEntry = ref<EntryDto | null>(null);

const hasActiveFilter = computed(
  () =>
    selectedCategory.value !== 'all' ||
    selectedYear.value !== null ||
    selectedTag.value !== null ||
    searchKeyword.value.trim().length > 0
);

/**
 * Computes Bento grid column spans to create an editorial gallery rhythm
 * inspired by Demo B while keeping every row balanced.
 */
function bentoSpanClass(entry: EntryDto, index: number): string {
  if (entry.coverUrl && index % 5 === 0) {
    return 'md:col-span-8';
  }
  if (entry.coverUrl) {
    return 'md:col-span-6';
  }
  if (index % 5 === 1) {
    return 'md:col-span-4';
  }
  return 'md:col-span-6';
}

let searchTimeout: number | null = null;
function handleSearchDebounced() {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = window.setTimeout(() => {
    loadTimeline(true);
  }, 320);
}

function selectCategory(cat: string) {
  selectedCategory.value = cat;
  selectedYear.value = null;
  loadMetadata();
  loadTimeline(true);
}

function selectYear(year: number | null) {
  selectedYear.value = year;
  loadTimeline(true);
}

function selectTag(tag: string | null) {
  selectedTag.value = selectedTag.value === tag ? null : tag;
  loadTimeline(true);
}

function resetAllFilters() {
  selectedCategory.value = 'all';
  selectedYear.value = null;
  selectedTag.value = null;
  searchKeyword.value = '';
  loadMetadata();
  loadTimeline(true);
}

async function loadMetadata() {
  try {
    const yearParams: Record<string, string> = {};
    if (selectedCategory.value !== 'all') {
      yearParams.type = selectedCategory.value;
    }
    const [yearsRes, tagsRes] = await Promise.all([
      apiClient.get<number[]>('/api/v1/entries/years', { params: yearParams }),
      apiClient.get<TagDto[]>('/api/v1/tags'),
    ]);
    availableYears.value = Array.isArray(yearsRes) ? yearsRes : [];
    tags.value = Array.isArray(tagsRes) ? tagsRes : [];
  } catch {
    // Non-fatal metadata load
  }
}

async function loadTimeline(reset: boolean = false) {
  if (reset) {
    isLoading.value = true;
    nextCursor.value = null;
  } else {
    isLoadingMore.value = true;
  }

  try {
    const params: Record<string, string | number> = { limit: 18 };
    if (selectedCategory.value !== 'all') params.type = selectedCategory.value;
    if (selectedYear.value !== null) params.year = selectedYear.value;
    if (selectedTag.value) params.tag = selectedTag.value;
    if (searchKeyword.value.trim()) params.search = searchKeyword.value.trim();
    if (!reset && nextCursor.value) params.cursor = nextCursor.value;

    const res = await apiClient.getPaginated<EntryDto>('/api/v1/entries', { params });

    if (reset) {
      entries.value = res.items;
    } else {
      entries.value = [...entries.value, ...res.items];
    }

    nextCursor.value = res.pagination.cursor;
    hasMore.value = res.pagination.hasMore;
  } catch (err: any) {
    uiStore.notifyError(err?.message || '加载时光纪流失败');
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

function openDetailModal(entry: EntryDto) {
  selectedEntry.value = entry;
  isDetailOpen.value = true;
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
  const ok = await uiStore.confirm({
    title: '删除记忆条目',
    message: '确认删除此条记忆吗？此操作无法撤销。',
    confirmLabel: '确认删除',
    danger: true,
  });
  if (!ok) return;

  try {
    await apiClient.delete(`/api/v1/entries/${id}`);
    entries.value = entries.value.filter((e) => e.id !== id);
    uiStore.notifySuccess('已移除该条记忆');
    loadMetadata();
  } catch (err: any) {
    uiStore.notifyError(err?.message || '删除失败');
  }
}

function handleEntrySaved(_saved: EntryDto) {
  loadMetadata();
  loadTimeline(true);
}

watch(
  () => authStore.isAdmin,
  () => {
    loadMetadata();
    loadTimeline(true);
  }
);

watch(
  () => uiStore.pendingAction,
  (action) => {
    if (action === 'entry') {
      uiStore.consumeQuickAction('entry');
      openCreateModal();
    }
  },
  { immediate: true }
);

onMounted(() => {
  loadMetadata();
  loadTimeline(true);
});
</script>
