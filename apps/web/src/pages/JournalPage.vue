<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-[#E5E1D8] pb-6">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="text-[11px] font-mono tracking-widest text-[#C25438] uppercase font-semibold">FIELD NOTES & ESSAYS</span>
          <span class="text-[#D4CEBF]">&middot;</span>
          <span class="text-[11px] font-mono text-[#9E9B93]">随笔手札</span>
        </div>
        <h1 class="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-[#1D1C1A] flex items-center gap-3">
          <span>随想手札</span>
        </h1>
        <p class="mt-1 text-sm text-[#747169] font-serif italic">
          “纸短情长，记录下此时此刻的心情温度与思绪沉淀。”
        </p>
      </div>

      <!-- Admin write actions -->
      <div v-if="authStore.isAdmin" class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-[#C25438] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A9442C] shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          @click="openWriteModal"
        >
          <PenSquareIcon class="w-3.5 h-3.5" />
          <span>撰写手札</span>
        </button>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div
        v-for="i in 4"
        :key="i"
        class="h-44 rounded-2xl bg-white border border-[#E5E1D8] p-6 animate-pulse space-y-3"
      >
        <div class="h-4 bg-[#EFECE4] rounded w-1/3"></div>
        <div class="h-6 bg-[#EFECE4] rounded w-2/3"></div>
        <div class="h-12 bg-[#EFECE4]/60 rounded w-full"></div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="journals.length === 0"
      class="rounded-2xl border border-dashed border-[#D4CEBF] bg-white/60 p-16 text-center"
    >
      <BookOpenIcon class="w-12 h-12 text-[#9E9B93] mx-auto mb-3" />
      <h3 class="font-serif text-lg font-medium text-[#1D1C1A]">暂无日记手札</h3>
      <p class="text-xs text-[#747169] mt-1 max-w-sm mx-auto">
        纸短情长，记录下此刻的所思所想、天气与生活琐碎吧。
      </p>
      <button
        v-if="authStore.isAdmin"
        type="button"
        class="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#C25438] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A9442C] transition-colors"
        @click="openWriteModal"
      >
        <PenSquareIcon class="w-3.5 h-3.5" />
        <span>撰写第一篇随想手札</span>
      </button>
    </div>

    <!-- Journal Cards Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <article
        v-for="journal in journals"
        :key="journal.id"
        class="group rounded-2xl border border-[#E5E1D8] bg-white p-6 shadow-sm transition-all duration-200 hover:border-[#D4CEBF] hover:shadow-md hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between"
        @click="readJournal(journal)"
      >
        <div>
          <!-- Top Row: Mood, Weather & Date -->
          <div class="flex items-center justify-between text-xs text-[#747169] mb-3">
            <div class="flex items-center gap-2">
              <span v-if="journal.mood" class="text-[#C25438] font-medium flex items-center gap-1 font-mono text-[11px] bg-[#FDF8F6] px-2 py-0.5 rounded border border-[#F0D5CD]">
                <span>✨ {{ journal.mood }}</span>
              </span>
              <span v-if="journal.weather" class="text-[#747169] flex items-center gap-1 font-mono text-[11px]">
                <span>{{ journal.weather }}</span>
              </span>
            </div>
            <span class="font-mono text-xs text-[#9E9B93]">
              {{ formatOccurredAt(journal.occurredAt) }}
            </span>
          </div>

          <!-- Title -->
          <h3 class="font-serif text-lg sm:text-xl font-medium text-[#1D1C1A] group-hover:text-[#C25438] transition-colors leading-snug">
            {{ journal.title }}
          </h3>

          <!-- Summary / Excerpt -->
          <p class="mt-2.5 text-xs text-[#747169] line-clamp-3 leading-relaxed">
            {{ journal.summary || journal.contentMarkdown || '点击阅读日记全文...' }}
          </p>
        </div>

        <!-- Bottom Row: Word count & Read prompt -->
        <div class="mt-5 pt-3 border-t border-[#F0ECE1] flex items-center justify-between text-xs text-[#9E9B93] font-mono">
          <div class="flex items-center gap-1">
            <span v-if="journal.wordCount">{{ journal.wordCount }} 字</span>
            <span v-else-if="journal.contentMarkdown">{{ journal.contentMarkdown.length }} 字符</span>
          </div>
          <span class="text-[#C25438] group-hover:translate-x-0.5 text-xs font-sans font-medium flex items-center gap-1 transition-transform">
            <span>翻阅全文</span>
            <span>&rarr;</span>
          </span>
        </div>
      </article>
    </div>

    <!-- Read Journal Drawer / Modal -->
    <div
      v-if="readingJournal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="readingJournal = null"></div>
      <div
        class="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-[#E5E1D8] bg-[#F7F5F0] shadow-2xl overflow-hidden"
      >
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-[#E5E1D8] px-6 py-4 bg-white">
          <div>
            <h3 class="font-serif text-xl font-medium text-[#1D1C1A]">{{ readingJournal.title }}</h3>
            <div class="mt-1 flex items-center gap-2 text-xs font-mono text-[#747169]">
              <span class="text-[#C25438]">{{ readingJournal.mood || '生活手札' }}</span>
              <span>&middot;</span>
              <span>{{ formatOccurredAt(readingJournal.occurredAt) }}</span>
            </div>
          </div>
          <button
            type="button"
            class="rounded-lg p-2 text-[#747169] hover:text-[#1D1C1A] hover:bg-[#EFECE4] transition-colors"
            @click="readingJournal = null"
          >
            ✕
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto px-8 py-6 leading-relaxed space-y-4 bg-[#F7F5F0]">
          <p class="whitespace-pre-line text-sm text-[#1D1C1A] leading-loose font-normal">
            {{ readingJournal.contentMarkdown || readingJournal.summary || '暂无详细正文内容。' }}
          </p>
        </div>
      </div>
    </div>

    <!-- Write Journal Modal -->
    <div
      v-if="isWriteModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="isWriteModalOpen = false"></div>
      <div class="relative w-full max-w-xl rounded-2xl border border-[#E5E1D8] bg-white shadow-2xl p-6 overflow-hidden">
        <div class="flex items-center justify-between border-b border-[#E5E1D8] pb-4 mb-4">
          <h3 class="font-serif text-lg font-medium text-[#1D1C1A] flex items-center gap-2">
            <PenSquareIcon class="w-4 h-4 text-[#C25438]" />
            <span>撰写时光手札</span>
          </h3>
          <button
            type="button"
            class="text-[#747169] hover:text-[#1D1C1A]"
            @click="isWriteModalOpen = false"
          >
            ✕
          </button>
        </div>

        <form @submit.prevent="handleCreateJournal" class="space-y-4 text-xs">
          <div>
            <label class="block text-[#1D1C1A] mb-1 font-medium">手札标题 *</label>
            <input
              v-model="newJournal.title"
              type="text"
              required
              placeholder="例如：冬日初雪漫谈 / 岁末思绪"
              class="w-full rounded-xl bg-[#F7F5F0] border border-[#E5E1D8] px-3.5 py-2 text-[#1D1C1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#C25438]/60 focus:bg-white transition-colors"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[#1D1C1A] mb-1 font-medium">今日心情</label>
              <select
                v-model="newJournal.mood"
                class="w-full rounded-xl bg-[#F7F5F0] border border-[#E5E1D8] px-3.5 py-2 text-[#1D1C1A] focus:outline-none focus:border-[#C25438]/60 focus:bg-white transition-colors"
              >
                <option value="晴朗">✨ 晴朗 / 心情畅快</option>
                <option value="宁静">🌿 宁静 / 专注冥想</option>
                <option value="雀跃">🎉 雀跃 / 欣喜收获</option>
                <option value="沉思">🌙 沉思 / 岁末反思</option>
              </select>
            </div>
            <div>
              <label class="block text-[#1D1C1A] mb-1 font-medium">天气状况</label>
              <select
                v-model="newJournal.weather"
                class="w-full rounded-xl bg-[#F7F5F0] border border-[#E5E1D8] px-3.5 py-2 text-[#1D1C1A] focus:outline-none focus:border-[#C25438]/60 focus:bg-white transition-colors"
              >
                <option value="晴朗">☀️ 晴朗温暖</option>
                <option value="多云">⛅ 微风多云</option>
                <option value="细雨">🌧️ 蒙蒙细雨</option>
                <option value="降雪">❄️ 冬日初雪</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-[#1D1C1A] mb-1 font-medium">简要导言</label>
            <input
              v-model="newJournal.summary"
              type="text"
              placeholder="一句话概括今日的心境..."
              class="w-full rounded-xl bg-[#F7F5F0] border border-[#E5E1D8] px-3.5 py-2 text-[#1D1C1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#C25438]/60 focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label class="block text-[#1D1C1A] mb-1 font-medium">手札正文 (Markdown) *</label>
            <textarea
              v-model="newJournal.contentMarkdown"
              required
              rows="6"
              placeholder="书写这一天的点点滴滴、灵感与思考..."
              class="w-full rounded-xl bg-[#F7F5F0] border border-[#E5E1D8] p-3 text-[#1D1C1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#C25438]/60 focus:bg-white leading-relaxed font-mono text-xs transition-colors"
            ></textarea>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E1D8]">
            <button
              type="button"
              class="px-4 py-2 rounded-xl text-[#747169] hover:text-[#1D1C1A]"
              @click="isWriteModalOpen = false"
            >
              取消
            </button>
            <button
              type="submit"
              class="px-5 py-2 rounded-xl bg-[#C25438] text-white font-medium hover:bg-[#A9442C] transition-colors shadow-sm"
            >
              保存手札
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  BookOpen as BookOpenIcon,
  PenSquare as PenSquareIcon,
} from 'lucide-vue-next';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { apiClient } from '@/shared/api/client';
import { formatDate } from '@archive/shared';

const authStore = useAuthStore();

interface JournalItem {
  id: string;
  title: string;
  summary?: string | null;
  contentMarkdown?: string;
  mood?: string | null;
  weather?: string | null;
  wordCount?: number;
  occurredAt: number;
}

const isLoading = ref(true);
const journals = ref<JournalItem[]>([]);
const readingJournal = ref<JournalItem | null>(null);
const isWriteModalOpen = ref(false);

const newJournal = ref({
  title: '',
  mood: '晴朗',
  weather: '晴朗',
  summary: '',
  contentMarkdown: '',
});

function formatOccurredAt(ts?: number): string {
  if (!ts) return '';
  return formatDate(ts, '.');
}

function openWriteModal() {
  newJournal.value = {
    title: '',
    mood: '晴朗',
    weather: '晴朗',
    summary: '',
    contentMarkdown: '',
  };
  isWriteModalOpen.value = true;
}

function readJournal(journal: JournalItem) {
  readingJournal.value = journal;
}

async function loadJournals() {
  isLoading.value = true;
  try {
    let data: any[] = [];
    try {
      data = await apiClient.get<any[]>('/api/v1/journals');
    } catch {
      data = await apiClient.get<any[]>('/api/v1/entries', { params: { type: 'journal' } });
    }

    if (data && data.length > 0) {
      journals.value = data;
    } else {
      // Default demo journals if none exists
      journals.value = [
        {
          id: 'journal-demo-1',
          title: '冬日初雪与架构落地记',
          summary: '窗外飘起零星初雪，数字档案馆的核心架构终于顺利成型。',
          contentMarkdown: '在这个数字化急速演进的时代，搭建一套完全受控、自主持久的个人档案中心，是最具仪式感的事情。\n\n从最初的 Monorepo 工程骨架，到如今的 WebP 预压缩、Leaflet 免费足迹、以及安全只读与暗门鉴权，每一步都记录着思维的凝结。',
          mood: '晴朗 / 充实',
          weather: '微风多云',
          wordCount: 120,
          occurredAt: Date.now() - 86400000 * 2,
        },
        {
          id: 'journal-demo-2',
          title: '深夜阅读与个人数字花园思辨',
          summary: '关于个人数据主权与云原生无服务器长效运行的探讨。',
          contentMarkdown: '软件会老去，商业云盘会涨价甚至停服，但纯净的静态文件与标准 SQL 会永存。\n\n选择 Cloudflare D1 + R2 + Web 纯前端的组合，就是为了保证未来的 10 年、20 年里，哪怕平台更迭，这些文字与照片依然可以毫发无损地被唤醒。',
          mood: '沉思',
          weather: '晴朗温暖',
          wordCount: 180,
          occurredAt: Date.now() - 86400000 * 8,
        },
      ];
    }
  } catch (err) {
    console.error('Failed to load journals:', err);
  } finally {
    isLoading.value = false;
  }
}

async function handleCreateJournal() {
  try {
    const journalToCreate = {
      title: newJournal.value.title,
      summary: newJournal.value.summary || null,
      contentMarkdown: newJournal.value.contentMarkdown,
      mood: newJournal.value.mood,
      weather: newJournal.value.weather,
      occurredAt: Date.now(),
    };

    let created: any = null;
    try {
      created = await apiClient.post('/api/v1/journals', journalToCreate);
    } catch {
      created = await apiClient.post('/api/v1/entries', {
        type: 'journal',
        title: journalToCreate.title,
        summary: journalToCreate.summary,
        occurredAt: journalToCreate.occurredAt,
        visibility: 'public',
        status: 'published',
        tags: ['日记', journalToCreate.mood].filter(Boolean),
      });
      created.contentMarkdown = journalToCreate.contentMarkdown;
      created.mood = journalToCreate.mood;
      created.weather = journalToCreate.weather;
    }

    journals.value.unshift(created);
    isWriteModalOpen.value = false;
  } catch (err: any) {
    alert(err.message || '创建日记失败');
  }
}

onMounted(() => {
  loadJournals();
});
</script>
