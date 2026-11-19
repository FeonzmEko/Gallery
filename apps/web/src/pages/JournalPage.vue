<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-[#E5E1D8] pb-6">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="text-[11px] font-mono tracking-widest text-[#C25438] uppercase font-semibold">FIELD NOTES &amp; ESSAYS</span>
          <span class="text-[#D4CEBF]">&middot;</span>
          <span class="text-[11px] font-mono text-[#9E9B93]">MARKDOWN ARCHIVE</span>
        </div>
        <h1 class="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-[#1D1C1A]">
          随想手札
        </h1>
        <p class="mt-1 text-sm text-[#747169] font-serif italic">
          “纸短情长，以纯文本留存此时此刻的心情温度与思绪沉淀。”
        </p>
      </div>

      <!-- Search & Admin Write -->
      <div class="flex flex-wrap items-center gap-3">
        <div class="relative">
          <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9E9B93]" />
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="检索手札标题或正文..."
            class="w-48 sm:w-56 rounded-xl bg-white border border-[#E5E1D8] pl-9 pr-3 py-2 text-xs text-[#1D1C1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#C25438]/50 focus:ring-1 focus:ring-[#C25438]/30 transition-all shadow-xs"
            @input="handleSearchDebounced"
          />
        </div>

        <button
          v-if="authStore.isAdmin"
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-[#C25438] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A9442C] shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
          @click="openCreateModal"
        >
          <PenSquareIcon class="w-3.5 h-3.5" />
          <span>撰写手札</span>
        </button>
      </div>
    </div>

    <!-- Mood Filter Bar -->
    <div class="flex flex-wrap items-center gap-2 border-b border-[#E5E1D8]/70 pb-4">
      <span class="text-[11px] font-mono text-[#9E9B93] mr-1">心境索引:</span>
      <button
        type="button"
        class="px-3 py-1 rounded-full text-xs font-medium transition-all border"
        :class="
          selectedMood === ''
            ? 'bg-[#1D1C1A] text-white border-[#1D1C1A]'
            : 'bg-white text-[#747169] border-[#E5E1D8] hover:border-[#D4CEBF] hover:text-[#1D1C1A]'
        "
        @click="selectMood('')"
      >
        全部
      </button>
      <button
        v-for="m in moodOptions"
        :key="m.value"
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all border"
        :class="
          selectedMood === m.value
            ? 'bg-[#C25438] text-white border-[#C25438]'
            : 'bg-white text-[#747169] border-[#E5E1D8] hover:border-[#D4CEBF] hover:text-[#1D1C1A]'
        "
        @click="selectMood(m.value)"
      >
        <component :is="m.icon" class="w-3 h-3" />
        <span>{{ m.label }}</span>
      </button>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div
        v-for="i in 4"
        :key="i"
        class="h-48 rounded-2xl bg-white border border-[#E5E1D8] p-6 animate-pulse space-y-3"
      >
        <div class="h-4 bg-[#EFECE4] rounded w-1/3"></div>
        <div class="h-6 bg-[#EFECE4] rounded w-2/3"></div>
        <div class="h-14 bg-[#EFECE4]/60 rounded w-full"></div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="journals.length === 0"
      class="rounded-2xl border border-dashed border-[#D4CEBF] bg-white/60 p-16 text-center"
    >
      <BookOpenIcon class="w-11 h-11 text-[#9E9B93] mx-auto mb-3" />
      <h3 class="font-serif text-lg font-medium text-[#1D1C1A]">暂无随想手札</h3>
      <p class="text-xs text-[#747169] mt-1 max-w-sm mx-auto">
        {{ searchKeyword || selectedMood ? '没有找到符合筛选条件的随笔记录。' : '纸短情长，记录下此刻的所思所想、天气与生活琐碎吧。' }}
      </p>
      <button
        v-if="authStore.isAdmin && !searchKeyword && !selectedMood"
        type="button"
        class="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#C25438] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A9442C] transition-colors"
        @click="openCreateModal"
      >
        <PenSquareIcon class="w-3.5 h-3.5" />
        <span>撰写第一篇随想手札</span>
      </button>
    </div>

    <!-- Journal Cards Bento Grid -->
    <div v-else class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <article
          v-for="journal in journals"
          :key="journal.id"
          class="group rounded-2xl border border-[#E5E1D8] bg-white p-6 shadow-xs transition-all duration-200 hover:border-[#D4CEBF] hover:shadow-md hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between"
          @click="readingJournal = journal"
        >
          <div>
            <!-- Top Row: Mood, Weather, Privacy & Date -->
            <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-[#747169] mb-3.5">
              <div class="flex items-center gap-2">
                <span
                  v-if="journal.mood"
                  class="inline-flex items-center gap-1 text-[#C25438] font-mono text-[11px] bg-[#FDF8F6] px-2 py-0.5 rounded-md border border-[#F0D5CD]"
                >
                  <FeatherIcon class="w-3 h-3" />
                  <span>{{ journal.mood }}</span>
                </span>
                <span
                  v-if="journal.weather"
                  class="inline-flex items-center gap-1 text-[#747169] font-mono text-[11px] bg-[#F7F5F0] px-2 py-0.5 rounded-md border border-[#E5E1D8]"
                >
                  <CloudSunIcon class="w-3 h-3 text-[#4E6053]" />
                  <span>{{ journal.weather }}</span>
                </span>
                <span
                  v-if="journal.visibility === 'private'"
                  class="inline-flex items-center gap-1 text-amber-800 font-mono text-[10px] bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200"
                >
                  <LockIcon class="w-2.5 h-2.5" />
                  <span>私密</span>
                </span>
              </div>

              <div class="flex items-center gap-2">
                <span class="font-mono text-[11px] text-[#9E9B93]">
                  {{ formatOccurredAt(journal.occurredAt) }}
                </span>
                <div
                  v-if="authStore.isAdmin"
                  class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  @click.stop
                >
                  <button
                    type="button"
                    class="p-1 rounded-md text-[#747169] hover:text-[#C25438] hover:bg-[#F7F5F0]"
                    @click="openEditModal(journal)"
                    title="编辑"
                  >
                    <PencilIcon class="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    class="p-1 rounded-md text-[#747169] hover:text-red-600 hover:bg-red-50"
                    @click="handleDeleteJournal(journal.id)"
                    title="删除"
                  >
                    <Trash2Icon class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Title -->
            <h3 class="font-serif text-xl font-medium text-[#1D1C1A] group-hover:text-[#C25438] transition-colors leading-snug">
              {{ journal.title }}
            </h3>

            <!-- Summary / Excerpt -->
            <p class="mt-2.5 text-sm text-[#747169] line-clamp-3 leading-relaxed">
              {{ journal.summary || '点击翻阅手札全文...' }}
            </p>

            <!-- Tags -->
            <div v-if="journal.tags && journal.tags.length > 0" class="mt-3 flex flex-wrap gap-1.5">
              <span
                v-for="tag in journal.tags"
                :key="tag"
                class="rounded-md bg-[#F7F5F0] px-2 py-0.5 text-[10px] font-mono text-[#747169] border border-[#E5E1D8]"
              >
                #{{ tag }}
              </span>
            </div>
          </div>

          <!-- Bottom Row -->
          <div class="mt-5 pt-3 border-t border-[#F0ECE1] flex items-center justify-between text-xs text-[#9E9B93] font-mono">
            <span>{{ journal.wordCount }} 字</span>
            <span class="text-[#C25438] group-hover:translate-x-0.5 text-xs font-sans font-medium flex items-center gap-1 transition-transform">
              <span>翻阅全文</span>
              <span>&rarr;</span>
            </span>
          </div>
        </article>
      </div>

      <!-- Pagination -->
      <div v-if="hasMore" class="pt-2 text-center">
        <button
          type="button"
          :disabled="isLoadingMore"
          class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white hover:bg-[#F7F5F0] border border-[#E5E1D8] text-xs font-medium text-[#1D1C1A] shadow-xs transition-all disabled:opacity-50"
          @click="loadJournals(false)"
        >
          <Loader2Icon v-if="isLoadingMore" class="w-3.5 h-3.5 animate-spin text-[#C25438]" />
          <span>{{ isLoadingMore ? '翻阅往期手札...' : '加载更多手札' }}</span>
        </button>
      </div>
    </div>

    <!-- Read Journal Modal (Formatted Markdown) -->
    <Teleport to="body">
      <div
        v-if="readingJournal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
      >
        <div class="fixed inset-0 bg-[#1D1C1A]/40 backdrop-blur-xs" @click="readingJournal = null"></div>
        <div
          class="relative w-full max-w-2xl max-h-[86vh] flex flex-col rounded-2xl border border-[#E5E1D8] bg-[#F7F5F0] shadow-2xl overflow-hidden"
        >
          <!-- Header -->
          <div class="flex items-start justify-between border-b border-[#E5E1D8] px-6 py-5 bg-white gap-4">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[#747169] mb-1.5">
                <span class="text-[#C25438] font-medium">{{ formatOccurredAt(readingJournal.occurredAt) }}</span>
                <span v-if="readingJournal.mood">&middot; {{ readingJournal.mood }}</span>
                <span v-if="readingJournal.weather">&middot; {{ readingJournal.weather }}</span>
                <span>&middot; {{ readingJournal.wordCount }} 字</span>
              </div>
              <h3 class="font-serif text-2xl font-medium text-[#1D1C1A] leading-snug">{{ readingJournal.title }}</h3>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button
                v-if="authStore.isAdmin"
                type="button"
                class="rounded-lg p-2 text-[#747169] hover:text-[#C25438] hover:bg-[#F7F5F0] transition-colors"
                @click="openEditFromReader(readingJournal)"
                title="编辑手札"
              >
                <PencilIcon class="w-4 h-4" />
              </button>
              <button
                type="button"
                class="rounded-lg p-2 text-[#747169] hover:text-[#1D1C1A] hover:bg-[#EFECE4] transition-colors"
                @click="readingJournal = null"
              >
                <XIcon class="w-5 h-5" />
              </button>
            </div>
          </div>

          <!-- Formatted Markdown Body -->
          <div class="flex-1 overflow-y-auto px-6 sm:px-8 py-6 bg-[#F7F5F0]">
            <div
              class="prose-archive text-[15px] leading-relaxed"
              v-html="renderMarkdown(readingJournal.contentMarkdown || readingJournal.summary || '')"
            ></div>
            <div v-if="readingJournal.tags && readingJournal.tags.length > 0" class="mt-8 pt-4 border-t border-[#E5E1D8] flex flex-wrap gap-2">
              <span
                v-for="tag in readingJournal.tags"
                :key="tag"
                class="rounded-md bg-white px-2.5 py-1 text-[11px] font-mono text-[#747169] border border-[#E5E1D8]"
              >
                #{{ tag }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Write / Edit Journal Modal -->
    <Teleport to="body">
      <div
        v-if="isWriteModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
      >
        <div class="fixed inset-0 bg-[#1D1C1A]/40 backdrop-blur-xs" @click="isWriteModalOpen = false"></div>
        <div class="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-[#E5E1D8] bg-[#F7F5F0] shadow-2xl overflow-hidden">
          <div class="flex items-center justify-between border-b border-[#E5E1D8] px-6 py-4 bg-white">
            <h3 class="font-serif text-lg font-medium text-[#1D1C1A] flex items-center gap-2">
              <PenSquareIcon class="w-4 h-4 text-[#C25438]" />
              <span>{{ editingJournalId ? '修订随想手札' : '撰写时光手札' }}</span>
            </h3>
            <button
              type="button"
              class="rounded-lg p-1.5 text-[#747169] hover:text-[#1D1C1A] hover:bg-[#EFECE4]"
              @click="isWriteModalOpen = false"
            >
              <XIcon class="w-5 h-5" />
            </button>
          </div>

          <form @submit.prevent="handleSaveJournal" class="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
            <div>
              <label class="block text-[#1D1C1A] mb-1.5 font-medium">手札标题 *</label>
              <input
                v-model="form.title"
                type="text"
                required
                placeholder="例如：冬日初雪漫谈 / 岁末思绪"
                class="w-full rounded-xl bg-white border border-[#E5E1D8] px-3.5 py-2.5 text-sm text-[#1D1C1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#C25438]/60 transition-colors"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-[#1D1C1A] mb-1.5 font-medium">发生时间 (occurred_at)</label>
                <input
                  v-model="occurredAtStr"
                  type="datetime-local"
                  required
                  class="w-full rounded-xl bg-white border border-[#E5E1D8] px-3 py-2 text-[#1D1C1A] font-mono focus:outline-none focus:border-[#C25438]/60"
                />
              </div>
              <div>
                <label class="block text-[#1D1C1A] mb-1.5 font-medium">今日心境</label>
                <select
                  v-model="form.mood"
                  class="w-full rounded-xl bg-white border border-[#E5E1D8] px-3 py-2 text-[#1D1C1A] focus:outline-none focus:border-[#C25438]/60"
                >
                  <option v-for="m in moodOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
                </select>
              </div>
              <div>
                <label class="block text-[#1D1C1A] mb-1.5 font-medium">天气状况</label>
                <select
                  v-model="form.weather"
                  class="w-full rounded-xl bg-white border border-[#E5E1D8] px-3 py-2 text-[#1D1C1A] focus:outline-none focus:border-[#C25438]/60"
                >
                  <option value="晴朗">晴朗温暖</option>
                  <option value="多云">微风多云</option>
                  <option value="细雨">蒙蒙细雨</option>
                  <option value="降雪">冬日初雪</option>
                  <option value="夜色">静谧夜晚</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[#1D1C1A] mb-1.5 font-medium">可见权限</label>
                <select
                  v-model="form.visibility"
                  class="w-full rounded-xl bg-white border border-[#E5E1D8] px-3 py-2 text-[#1D1C1A] focus:outline-none focus:border-[#C25438]/60"
                >
                  <option value="public">公开策展 (Public)</option>
                  <option value="private">私密仅己可见 (Private)</option>
                </select>
              </div>
              <div>
                <label class="block text-[#1D1C1A] mb-1.5 font-medium">标签 (逗号分隔)</label>
                <input
                  v-model="tagsInput"
                  type="text"
                  placeholder="例如：随笔, 阅读, 思辨"
                  class="w-full rounded-xl bg-white border border-[#E5E1D8] px-3.5 py-2 text-[#1D1C1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#C25438]/60"
                />
              </div>
            </div>

            <div>
              <label class="block text-[#1D1C1A] mb-1.5 font-medium">简要导言 (可选，留空自动提取)</label>
              <input
                v-model="form.summary"
                type="text"
                placeholder="一句话概括今日的心境..."
                class="w-full rounded-xl bg-white border border-[#E5E1D8] px-3.5 py-2 text-[#1D1C1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#C25438]/60"
              />
            </div>

            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="block text-[#1D1C1A] font-medium">手札正文 (支持 Markdown) *</label>
                <span class="font-mono text-[10px] text-[#9E9B93]">约 {{ form.contentMarkdown.trim().length }} 字符</span>
              </div>
              <textarea
                v-model="form.contentMarkdown"
                required
                rows="8"
                placeholder="# 标题&#10;&#10;书写这一天的点点滴滴、灵感与思考..."
                class="w-full rounded-xl bg-white border border-[#E5E1D8] p-3.5 text-[#1D1C1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#C25438]/60 leading-relaxed font-mono text-xs"
              ></textarea>
            </div>

            <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E1D8]">
              <button
                type="button"
                class="px-4 py-2 rounded-xl text-[#747169] hover:text-[#1D1C1A] hover:bg-[#EFECE4]"
                @click="isWriteModalOpen = false"
              >
                取消
              </button>
              <button
                type="submit"
                :disabled="isSubmitting"
                class="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#C25438] text-white font-medium hover:bg-[#A9442C] transition-colors shadow-xs disabled:opacity-50"
              >
                <Loader2Icon v-if="isSubmitting" class="w-3.5 h-3.5 animate-spin" />
                <span>{{ editingJournalId ? '保存修订' : '保存手札' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import {
  BookOpen as BookOpenIcon,
  PenSquare as PenSquareIcon,
  Search as SearchIcon,
  Feather as FeatherIcon,
  CloudSun as CloudSunIcon,
  Lock as LockIcon,
  Pencil as PencilIcon,
  Trash2 as Trash2Icon,
  X as XIcon,
  Loader2 as Loader2Icon,
  Sun as SunIcon,
  Coffee as CoffeeIcon,
  Sparkles as SparklesIcon,
  Moon as MoonIcon,
} from 'lucide-vue-next';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { useUiStore } from '@/shared/stores/ui.store';
import { apiClient } from '@/shared/api/client';
import { renderMarkdown } from '@/shared/utils/markdown';
import { formatDate } from '@archive/shared';
import type { Visibility } from '@archive/contracts';

const authStore = useAuthStore();
const uiStore = useUiStore();

interface JournalItem {
  id: string;
  title: string;
  summary?: string | null;
  contentMarkdown: string;
  mood?: string | null;
  weather?: string | null;
  wordCount: number;
  occurredAt: number;
  visibility: Visibility;
  tags?: string[];
}

const moodOptions = [
  { value: '晴朗', label: '晴朗畅快', icon: SunIcon },
  { value: '宁静', label: '宁静致远', icon: CoffeeIcon },
  { value: '雀跃', label: '欣喜雀跃', icon: SparklesIcon },
  { value: '沉思', label: '深夜沉思', icon: MoonIcon },
];

const isLoading = ref(true);
const isLoadingMore = ref(false);
const isSubmitting = ref(false);
const journals = ref<JournalItem[]>([]);
const nextCursor = ref<string | null>(null);
const hasMore = ref(false);
const searchKeyword = ref('');
const selectedMood = ref('');

const readingJournal = ref<JournalItem | null>(null);
const isWriteModalOpen = ref(false);
const editingJournalId = ref<string | null>(null);
const occurredAtStr = ref('');
const tagsInput = ref('');

const form = ref<{
  title: string;
  mood: string;
  weather: string;
  summary: string;
  contentMarkdown: string;
  visibility: Visibility;
}>({
  title: '',
  mood: '宁静',
  weather: '晴朗',
  summary: '',
  contentMarkdown: '',
  visibility: 'public',
});

function formatOccurredAt(ts?: number): string {
  if (!ts) return '';
  return formatDate(ts, '.');
}

function toLocalDatetimeInput(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function openCreateModal() {
  editingJournalId.value = null;
  form.value = {
    title: '',
    mood: '宁静',
    weather: '晴朗',
    summary: '',
    contentMarkdown: '',
    visibility: 'public',
  };
  occurredAtStr.value = toLocalDatetimeInput(Date.now());
  tagsInput.value = '';
  isWriteModalOpen.value = true;
}

function openEditModal(journal: JournalItem) {
  editingJournalId.value = journal.id;
  form.value = {
    title: journal.title,
    mood: journal.mood || '宁静',
    weather: journal.weather || '晴朗',
    summary: journal.summary || '',
    contentMarkdown: journal.contentMarkdown || '',
    visibility: journal.visibility || 'public',
  };
  occurredAtStr.value = toLocalDatetimeInput(journal.occurredAt);
  tagsInput.value = (journal.tags || []).join(', ');
  isWriteModalOpen.value = true;
}

function openEditFromReader(journal: JournalItem) {
  readingJournal.value = null;
  openEditModal(journal);
}

let searchTimer: number | null = null;
function handleSearchDebounced() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    loadJournals(true);
  }, 300);
}

function selectMood(mood: string) {
  selectedMood.value = mood;
  loadJournals(true);
}

async function loadJournals(reset: boolean = true) {
  if (reset) {
    isLoading.value = true;
    nextCursor.value = null;
  } else {
    isLoadingMore.value = true;
  }

  try {
    const params: Record<string, string | number> = { limit: 20 };
    if (selectedMood.value) params.mood = selectedMood.value;
    if (searchKeyword.value.trim()) params.search = searchKeyword.value.trim();
    if (!reset && nextCursor.value) params.cursor = nextCursor.value;

    const res = await apiClient.getPaginated<JournalItem>('/api/v1/journals', { params });
    if (reset) {
      journals.value = res.items;
    } else {
      journals.value = [...journals.value, ...res.items];
    }
    nextCursor.value = res.pagination.cursor;
    hasMore.value = res.pagination.hasMore;
  } catch (err: any) {
    uiStore.notifyError(err?.message || '加载随想手札失败');
  } finally {
    isLoading.value = false;
    isLoadingMore.value = false;
  }
}

async function handleSaveJournal() {
  const occurredAt = new Date(occurredAtStr.value).getTime();
  if (isNaN(occurredAt) || occurredAt <= 0) {
    uiStore.notifyError('请选择合法的发生时间');
    return;
  }

  const tags = tagsInput.value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  isSubmitting.value = true;
  try {
    const payload = {
      title: form.value.title.trim(),
      summary: form.value.summary.trim() || null,
      contentMarkdown: form.value.contentMarkdown,
      mood: form.value.mood,
      weather: form.value.weather,
      visibility: form.value.visibility,
      occurredAt,
      tags,
    };

    if (editingJournalId.value) {
      await apiClient.put<JournalItem>(`/api/v1/journals/${editingJournalId.value}`, payload);
      uiStore.notifySuccess('手札修订已保存');
    } else {
      await apiClient.post<JournalItem>('/api/v1/journals', payload);
      uiStore.notifySuccess('新随想手札已归档');
    }

    isWriteModalOpen.value = false;
    await loadJournals(true);
  } catch (err: any) {
    uiStore.notifyError(err?.message || '保存手札失败');
  } finally {
    isSubmitting.value = false;
  }
}

async function handleDeleteJournal(id: string) {
  const ok = await uiStore.confirm({
    title: '删除随想手札',
    message: '确定要删除这篇手札吗？删除后将不再显示。',
    confirmLabel: '确认删除',
    danger: true,
  });
  if (!ok) return;

  try {
    await apiClient.delete(`/api/v1/journals/${id}`);
    journals.value = journals.value.filter((j) => j.id !== id);
    if (readingJournal.value?.id === id) readingJournal.value = null;
    uiStore.notifySuccess('已移除该篇手札');
  } catch (err: any) {
    uiStore.notifyError(err?.message || '删除手札失败');
  }
}

watch(
  () => authStore.isAdmin,
  () => {
    loadJournals(true);
  }
);

watch(
  () => uiStore.pendingAction,
  (action) => {
    if (action === 'journal') {
      uiStore.consumeQuickAction('journal');
      openCreateModal();
    }
  },
  { immediate: true }
);

onMounted(() => {
  loadJournals(true);
});
</script>
