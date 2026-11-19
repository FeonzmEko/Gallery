<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/60 pb-5">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <BookOpenIcon class="w-7 h-7 text-amber-400" />
          <span>随想日记</span>
        </h1>
        <p class="mt-1 text-sm text-slate-400">
          Markdown 富文本札记 · 心情温度与生活随感留痕
        </p>
      </div>

      <!-- Admin write actions -->
      <div v-if="authStore.isAdmin" class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          @click="openWriteModal"
        >
          <PenSquareIcon class="w-4 h-4" />
          <span>撰写日记</span>
        </button>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="i in 4"
        :key="i"
        class="h-44 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse"
      ></div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="journals.length === 0"
      class="rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center"
    >
      <BookOpenIcon class="w-12 h-12 text-slate-600 mx-auto mb-3" />
      <h3 class="text-base font-semibold text-slate-200">暂无日记记录</h3>
      <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
        纸短情长，记录下此刻的所思所想、天气与生活琐碎吧。
      </p>
      <button
        v-if="authStore.isAdmin"
        type="button"
        class="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition-colors"
        @click="openWriteModal"
      >
        <PenSquareIcon class="w-4 h-4" />
        <span>撰写第一篇随想日记</span>
      </button>
    </div>

    <!-- Journal Cards Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <article
        v-for="journal in journals"
        :key="journal.id"
        class="group rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm transition-all duration-200 hover:border-amber-500/40 hover:bg-slate-900/80 hover:shadow-xl hover:shadow-amber-500/5 cursor-pointer flex flex-col justify-between"
        @click="readJournal(journal)"
      >
        <div>
          <!-- Top Row: Mood, Weather & Date -->
          <div class="flex items-center justify-between text-xs text-slate-400 mb-2.5">
            <div class="flex items-center gap-2">
              <span v-if="journal.mood" class="text-amber-400 font-medium flex items-center gap-1">
                <span>✨ {{ journal.mood }}</span>
              </span>
              <span v-if="journal.weather" class="text-slate-400 flex items-center gap-1">
                <span>• {{ journal.weather }}</span>
              </span>
            </div>
            <span class="font-mono text-xs text-slate-400">
              {{ formatOccurredAt(journal.occurredAt) }}
            </span>
          </div>

          <!-- Title -->
          <h3 class="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
            {{ journal.title }}
          </h3>

          <!-- Summary / Excerpt -->
          <p class="mt-2 text-xs text-slate-300 line-clamp-3 leading-relaxed">
            {{ journal.summary || journal.contentMarkdown || '点击阅读日记全文...' }}
          </p>
        </div>

        <!-- Bottom Row: Word count & Tags -->
        <div class="mt-4 pt-3 border-t border-slate-800/70 flex items-center justify-between text-xs text-slate-500">
          <div class="flex items-center gap-1">
            <span v-if="journal.wordCount">{{ journal.wordCount }} 字</span>
            <span v-else-if="journal.contentMarkdown">{{ journal.contentMarkdown.length }} 字符</span>
          </div>
          <span class="text-amber-400/90 group-hover:text-amber-300 text-[11px] font-medium flex items-center gap-1">
            <span>阅读全文</span>
            <span>→</span>
          </span>
        </div>
      </article>
    </div>

    <!-- Read Journal Drawer / Modal -->
    <div
      v-if="readingJournal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      <div class="fixed inset-0 bg-slate-950/80 backdrop-blur-md" @click="readingJournal = null"></div>
      <div
        class="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden backdrop-blur-xl"
      >
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-800/80 px-6 py-4">
          <div>
            <h3 class="text-base font-semibold text-white">{{ readingJournal.title }}</h3>
            <div class="mt-1 flex items-center gap-2 text-xs text-slate-400">
              <span class="text-amber-400">{{ readingJournal.mood || '生活记录' }}</span>
              <span>•</span>
              <span>{{ formatOccurredAt(readingJournal.occurredAt) }}</span>
            </div>
          </div>
          <button
            type="button"
            class="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-800"
            @click="readingJournal = null"
          >
            ✕
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto px-6 py-5 prose prose-invert prose-sm max-w-none text-slate-200 leading-relaxed space-y-4">
          <p class="whitespace-pre-line text-sm text-slate-200 leading-relaxed font-normal">
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
      <div class="fixed inset-0 bg-slate-950/80 backdrop-blur-md" @click="isWriteModalOpen = false"></div>
      <div class="relative w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl p-6 overflow-hidden">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <h3 class="text-base font-semibold text-white flex items-center gap-2">
            <PenSquareIcon class="w-5 h-5 text-amber-400" />
            <span>撰写时光日记</span>
          </h3>
          <button
            type="button"
            class="text-slate-400 hover:text-white"
            @click="isWriteModalOpen = false"
          >
            ✕
          </button>
        </div>

        <form @submit.prevent="handleCreateJournal" class="space-y-4 text-xs">
          <div>
            <label class="block text-slate-300 mb-1 font-medium">日记标题 *</label>
            <input
              v-model="newJournal.title"
              type="text"
              required
              placeholder="例如：冬日初雪漫谈 / 岁末思绪"
              class="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-300 mb-1 font-medium">今日心情</label>
              <select
                v-model="newJournal.mood"
                class="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="晴朗">✨ 晴朗 / 心情畅快</option>
                <option value="宁静">🌿 宁静 / 专注冥想</option>
                <option value="雀跃">🎉 雀跃 / 欣喜收获</option>
                <option value="沉思">🌙 沉思 / 岁末反思</option>
              </select>
            </div>
            <div>
              <label class="block text-slate-300 mb-1 font-medium">天气状况</label>
              <select
                v-model="newJournal.weather"
                class="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="晴朗">☀️ 晴朗温暖</option>
                <option value="多云">⛅ 微风多云</option>
                <option value="细雨">🌧️ 蒙蒙细雨</option>
                <option value="降雪">❄️ 冬日初雪</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-slate-300 mb-1 font-medium">简要导言</label>
            <input
              v-model="newJournal.summary"
              type="text"
              placeholder="一句话概括今日的心境..."
              class="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label class="block text-slate-300 mb-1 font-medium">日记正文 (Markdown) *</label>
            <textarea
              v-model="newJournal.contentMarkdown"
              required
              rows="6"
              placeholder="书写这一天的点点滴滴、灵感与思考..."
              class="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 leading-relaxed font-mono text-xs"
            ></textarea>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              class="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
              @click="isWriteModalOpen = false"
            >
              取消
            </button>
            <button
              type="submit"
              class="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 transition-colors"
            >
              保存日记
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
