<template>
  <div class="gallery-reveal space-y-10 sm:space-y-12">
    <!-- ========================================================= -->
    <!-- MONUMENTAL EDITORIAL MASTHEAD (Asymmetric 12-Col Spread)  -->
    <!-- ========================================================= -->
    <section class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-end pb-8 border-b border-[#DDD6C9]">
      <div class="lg:col-span-7 space-y-3">
        <div class="flex items-center gap-3 kicker-caps text-[#9A3F2B]">
          <span>CHAPTER I</span>
          <span class="w-6 h-[1px] bg-[#C4BBA9]"></span>
          <span class="text-[#787268]">CHRONICLE INDEX · OCCURRED AT</span>
        </div>
        <div class="flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <h1 class="font-serif text-4xl sm:text-5xl lg:text-[54px] font-light tracking-[0.04em] text-[#161513] leading-[1.12]">
            时光纪流
          </h1>
          <span class="font-display italic text-2xl sm:text-3xl font-light text-[#9B9488] tracking-wide">
            L’archive du temps
          </span>
        </div>
      </div>

      <div class="lg:col-span-5 flex flex-col lg:items-end justify-between gap-4">
        <p class="font-serif text-[13.5px] sm:text-sm text-[#4A4640] leading-[1.85] lg:text-right max-w-md font-light [text-wrap:balance]">
          将散落岁月的光斑、足迹与思绪，按真实发生刻度逐一妥善归档。
        </p>

        <div class="flex flex-wrap items-center gap-4">
          <div class="flex items-center gap-3 font-mono text-[11px] tracking-[0.14em] text-[#57534C] tabular-nums">
            <span>{{ entries.length }} 卷展品</span>
            <span v-if="yearRangeLabel" class="text-[#C4BBA9]">/</span>
            <span v-if="yearRangeLabel">{{ yearRangeLabel }}</span>
          </div>

          <button
            v-if="authStore.isAdmin"
            type="button"
            class="inline-flex items-center gap-2 rounded-[2px] bg-[#161513] px-4 py-2 text-xs font-serif tracking-[0.14em] text-[#FAF8F4] hover:bg-[#9A3F2B] transition-colors duration-200"
            @click="openCreateModal"
          >
            <PlusIcon class="w-3.5 h-3.5" />
            <span>记录此刻</span>
          </button>
        </div>
      </div>
    </section>

    <!-- ========================================================= -->
    <!-- ARCHITECTURAL INDEX CONTROL RAIL                          -->
    <!-- ========================================================= -->
    <section class="space-y-4">
      <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-5 border-b border-[#DDD6C9]">
        <!-- Category Pure Typographic Tabs -->
        <div class="flex flex-wrap items-center gap-6 sm:gap-8">
          <button
            v-for="cat in categories"
            :key="cat.value"
            type="button"
            class="relative pb-3.5 text-[13px] font-serif tracking-[0.12em] transition-colors shrink-0"
            :class="
              selectedCategory === cat.value
                ? 'text-[#161513] font-medium'
                : 'text-[#57534C] hover:text-[#161513]'
            "
            @click="selectCategory(cat.value)"
          >
            <span>{{ cat.label }}</span>
            <span
              class="absolute -bottom-[1px] inset-x-0 h-[1.5px] bg-[#9A3F2B] transition-transform duration-300 ease-gallery origin-left"
              :class="selectedCategory === cat.value ? 'scale-x-100' : 'scale-x-0'"
            ></span>
          </button>
        </div>

        <!-- Right Controls: Search + Year Scale + Layout Switcher -->
        <div class="flex flex-wrap items-center gap-5 sm:gap-6 pb-3">
          <!-- Year Scale Ruler -->
          <div v-if="availableYears.length > 0" class="flex flex-wrap items-center gap-3 text-xs">
            <span class="kicker-caps text-[#6E685E]">YEAR</span>
            <button
              type="button"
              class="font-mono text-[11px] tracking-wider transition-colors"
              :class="selectedYear === null ? 'text-[#9A3F2B] font-medium underline underline-offset-4' : 'text-[#57534C] hover:text-[#161513]'"
              @click="selectYear(null)"
            >
              ALL
            </button>
            <button
              v-for="year in availableYears"
              :key="year"
              type="button"
              class="font-mono text-[11px] tracking-wider tabular-nums transition-colors"
              :class="selectedYear === year ? 'text-[#9A3F2B] font-medium underline underline-offset-4' : 'text-[#57534C] hover:text-[#161513]'"
              @click="selectYear(year)"
            >
              {{ year }}
            </button>
          </div>

          <span v-if="availableYears.length > 0" class="hidden sm:inline-block h-3.5 w-[1px] bg-[#DDD6C9]"></span>

          <!-- Minimalist Underline Search Input -->
          <div class="relative flex items-center">
            <SearchIcon class="w-3.5 h-3.5 text-[#6E685E] pointer-events-none mr-2" />
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="检索记忆与标签..."
              class="w-40 sm:w-48 bg-transparent border-b border-[#C4BBA9] focus:border-[#161513] pb-1 text-xs text-[#161513] placeholder-[#787268] focus:outline-none transition-colors"
              @input="handleSearchDebounced"
            />
          </div>

          <!-- Sharp View Mode Toggle -->
          <div class="inline-flex items-center border border-[#DDD6C9] rounded-[2px] bg-[#FAF8F4] text-[11px] font-serif tracking-[0.12em]">
            <button
              type="button"
              class="px-3 py-1 transition-colors"
              :class="viewMode === 'bento' ? 'bg-[#161513] text-[#FAF8F4]' : 'text-[#57534C] hover:text-[#161513]'"
              @click="viewMode = 'bento'"
              title="画册策展视图"
            >
              画册
            </button>
            <button
              type="button"
              class="px-3 py-1 border-l border-[#DDD6C9] transition-colors"
              :class="viewMode === 'spine' ? 'bg-[#161513] text-[#FAF8F4]' : 'text-[#57534C] hover:text-[#161513]'"
              @click="viewMode = 'spine'"
              title="编年卷宗视图"
            >
              编年
            </button>
          </div>
        </div>
      </div>

      <!-- Quiet Tag Index Strip -->
      <div v-if="tags.length > 0 || selectedTag" class="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1">
        <span class="kicker-caps text-[#6E685E]">INDEX</span>
        <button
          v-if="selectedTag"
          type="button"
          class="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#FAF8F4] bg-[#9A3F2B] px-2.5 py-0.5 rounded-[2px]"
          @click="selectTag(null)"
        >
          <span>#{{ selectedTag }}</span>
          <XIcon class="w-3 h-3" />
        </button>
        <button
          v-for="tag in tags.slice(0, 14)"
          :key="tag.id"
          v-show="tag.name !== selectedTag"
          type="button"
          class="text-[11px] font-mono text-[#57534C] hover:text-[#9A3F2B] transition-colors"
          @click="selectTag(tag.name)"
        >
          #{{ tag.name }}
        </button>
      </div>
    </section>

    <!-- ========================================================= -->
    <!-- LOADING SKELETONS (Architectural Hairline Placeholders)   -->
    <!-- ========================================================= -->
    <div v-if="isLoading && entries.length === 0" class="grid grid-cols-1 md:grid-cols-12 gap-7">
      <div class="md:col-span-12 h-72 bg-[#FAF8F4] border border-[#DDD6C9] p-8 animate-pulse grid grid-cols-12 gap-8">
        <div class="col-span-7 bg-[#EAE4D8]"></div>
        <div class="col-span-5 space-y-4 py-4">
          <div class="h-3 bg-[#EAE4D8] w-1/3"></div>
          <div class="h-7 bg-[#EAE4D8] w-4/5"></div>
          <div class="h-16 bg-[#EAE4D8]/60 w-full"></div>
        </div>
      </div>
      <div
        v-for="i in 2"
        :key="i"
        class="md:col-span-6 h-60 bg-[#FAF8F4] border border-[#DDD6C9] p-7 animate-pulse space-y-4"
      >
        <div class="h-3 bg-[#EAE4D8] w-1/4"></div>
        <div class="h-6 bg-[#EAE4D8] w-2/3"></div>
        <div class="h-14 bg-[#EAE4D8]/60 w-full"></div>
      </div>
    </div>

    <!-- ========================================================= -->
    <!-- SERENE MUSEUM PLINTH EMPTY STATE                          -->
    <!-- ========================================================= -->
    <div
      v-else-if="entries.length === 0"
      class="py-24 sm:py-32 px-6 text-center flex flex-col items-center justify-center border-y border-[#DDD6C9] bg-[#FAF8F4]/40"
    >
      <div class="w-[1px] h-10 bg-[#C4BBA9] mb-6"></div>
      <div class="relative w-10 h-10 flex items-center justify-center mb-6">
        <span class="absolute inset-0 border border-[#C4BBA9]"></span>
        <span class="absolute inset-[5px] border border-[#DDD6C9]"></span>
        <span class="w-1.5 h-1.5 rounded-full bg-[#9A3F2B]"></span>
      </div>
      <p class="font-display italic text-lg text-[#9B9488] tracking-wide">
        {{ hasActiveFilter ? 'No Matching Plates' : 'Silence Before the First Plate' }}
      </p>
      <h4 class="mt-2 font-serif text-2xl font-light tracking-[0.08em] text-[#161513]">
        {{ hasActiveFilter ? '未检得契合之卷宗' : '展厅尚待启幕' }}
      </h4>
      <p class="mt-3 text-xs text-[#787268] max-w-sm leading-[1.9] font-light">
        {{
          hasActiveFilter
            ? '当前筛选条件下尚无对应藏品，可重置索引以回到完整编年展陈。'
            : '此处尚未收录时间线记忆。馆长可通过右上角暗门解锁策展台，书写第一页编年卷宗。'
        }}
      </p>
      <div class="mt-8 flex items-center justify-center gap-4">
        <button
          v-if="hasActiveFilter"
          type="button"
          class="rounded-[2px] border border-[#161513] px-5 py-2 text-xs font-serif tracking-[0.16em] text-[#161513] hover:bg-[#161513] hover:text-[#FAF8F4] transition-colors"
          @click="resetAllFilters"
        >
          重置索引筛选
        </button>
        <button
          v-if="authStore.isAdmin && !hasActiveFilter"
          type="button"
          class="inline-flex items-center gap-2 rounded-[2px] bg-[#161513] px-5 py-2.5 text-xs font-serif tracking-[0.16em] text-[#FAF8F4] hover:bg-[#9A3F2B] transition-colors"
          @click="openCreateModal"
        >
          <PlusIcon class="w-3.5 h-3.5" />
          <span>收录首卷时光</span>
        </button>
      </div>
    </div>

    <!-- ========================================================= -->
    <!-- VIEW 1: CURATED EXHIBITION MONOGRAPH GRID                 -->
    <!-- ========================================================= -->
    <div v-else-if="viewMode === 'bento'" class="space-y-10">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-7 lg:gap-8 items-stretch">
        <TimelineCard
          v-for="(entry, idx) in entries"
          :key="entry.id"
          :entry="entry"
          :index="idx"
          :is-admin="authStore.isAdmin"
          :layout="idx === 0 && entry.coverUrl ? 'lead' : 'bento'"
          :featured="bentoSpanClass(entry, idx).includes('col-span-7') || bentoSpanClass(entry, idx).includes('col-span-8')"
          :class="bentoSpanClass(entry, idx)"
          @select="openDetailModal"
          @edit="handleEditEntry"
          @delete="handleDeleteEntry"
          @tag-click="selectTag"
        />
      </div>

      <div v-if="hasMore" class="pt-6 text-center">
        <button
          type="button"
          :disabled="isLoadingMore"
          class="inline-flex items-center gap-3 px-8 py-3 rounded-[2px] border border-[#161513] text-xs font-serif tracking-[0.18em] text-[#161513] hover:bg-[#161513] hover:text-[#FAF8F4] transition-colors duration-200 disabled:opacity-40"
          @click="loadMore"
        >
          <Loader2Icon v-if="isLoadingMore" class="w-3.5 h-3.5 animate-spin" />
          <span>{{ isLoadingMore ? '正在溯流历史卷宗...' : '向下溯流更多历史' }}</span>
        </button>
      </div>
    </div>

    <!-- ========================================================= -->
    <!-- VIEW 2: BOOK ANNALS LEDGER (Chronological Spine)          -->
    <!-- ========================================================= -->
    <div v-else class="border-t border-[#DDD6C9]">
      <TimelineCard
        v-for="(entry, idx) in entries"
        :key="entry.id"
        :entry="entry"
        :index="idx"
        :is-admin="authStore.isAdmin"
        layout="spine"
        @select="openDetailModal"
        @edit="handleEditEntry"
        @delete="handleDeleteEntry"
        @tag-click="selectTag"
      />

      <div v-if="hasMore" class="pt-10 text-center">
        <button
          type="button"
          :disabled="isLoadingMore"
          class="inline-flex items-center gap-3 px-8 py-3 rounded-[2px] border border-[#161513] text-xs font-serif tracking-[0.18em] text-[#161513] hover:bg-[#161513] hover:text-[#FAF8F4] transition-colors duration-200 disabled:opacity-40"
          @click="loadMore"
        >
          <Loader2Icon v-if="isLoadingMore" class="w-3.5 h-3.5 animate-spin" />
          <span>{{ isLoadingMore ? '正在溯流历史卷宗...' : '向下溯流更多历史' }}</span>
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
  Plus as PlusIcon,
  Search as SearchIcon,
  Loader2 as Loader2Icon,
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
  { label: '全部时光', value: 'all' },
  { label: '摄影胶片', value: 'photo' },
  { label: '随想手札', value: 'journal' },
  { label: '旅行足迹', value: 'trip' },
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

const yearRangeLabel = computed(() => {
  if (availableYears.value.length === 0) return '';
  if (availableYears.value.length === 1) return String(availableYears.value[0]);
  const sorted = [...availableYears.value].sort((a, b) => a - b);
  return `${sorted[0]} — ${sorted[sorted.length - 1]}`;
});

/**
 * Editorial asymmetry rhythm:
 * - Index 0 with cover => full-width 12-column Lead Monograph Spread
 * - Following items alternate cleanly between 7+5, 5+7, and 6+6 pairings
 */
function bentoSpanClass(entry: EntryDto, index: number): string {
  if (index === 0 && entry.coverUrl) {
    return 'md:col-span-12';
  }
  const hasLead = entries.value[0]?.coverUrl ? 1 : 0;
  const pos = index - hasLead;
  const cycle = pos % 6;
  if (cycle === 0) return 'md:col-span-7';
  if (cycle === 1) return 'md:col-span-5';
  if (cycle === 2) return 'md:col-span-5';
  if (cycle === 3) return 'md:col-span-7';
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
