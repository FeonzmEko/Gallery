<template>
  <Teleport to="body">
    <div
      v-if="modelValue && entry"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="fixed inset-0 bg-[#1D1C1A]/45 backdrop-blur-xs transition-opacity"
        @click="close"
      ></div>

      <div
        class="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-[#E5E1D8] bg-[#F7F5F0] shadow-2xl overflow-hidden"
      >
        <!-- Header -->
        <div class="flex items-start justify-between gap-4 border-b border-[#E5E1D8] bg-white px-6 py-4">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[#747169] mb-1">
              <span class="text-[#C25438] font-semibold uppercase">{{ typeLabel }}</span>
              <span>&middot;</span>
              <span>{{ formatDateTime(entry.occurredAt, false) }}</span>
              <span
                v-if="entry.visibility === 'private'"
                class="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-800 border border-amber-200"
              >
                私密
              </span>
              <span
                v-if="entry.status === 'draft'"
                class="rounded bg-[#EFECE4] px-1.5 py-0.5 text-[10px] text-[#747169] border border-[#E5E1D8]"
              >
                草稿
              </span>
            </div>
            <h2 class="font-serif text-2xl font-medium text-[#1D1C1A] leading-snug">
              {{ entry.title }}
            </h2>
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <button
              v-if="isAdmin"
              type="button"
              class="rounded-lg p-2 text-[#747169] hover:text-[#C25438] hover:bg-[#F7F5F0] transition-colors"
              @click="emit('edit', entry); close()"
              title="编辑条目"
            >
              <PencilIcon class="w-4 h-4" />
            </button>
            <button
              type="button"
              class="rounded-lg p-2 text-[#747169] hover:text-[#1D1C1A] hover:bg-[#EFECE4] transition-colors"
              @click="close"
            >
              <XIcon class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- Scrollable Body -->
        <div class="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <!-- Cover Photo -->
          <div
            v-if="entry.coverUrl"
            class="rounded-2xl border border-[#E5E1D8] bg-white p-2 shadow-xs overflow-hidden"
          >
            <img
              :src="entry.coverUrl"
              :alt="entry.title"
              class="w-full max-h-[420px] object-contain rounded-xl bg-[#EFECE4]"
            />
          </div>

          <!-- Summary -->
          <p v-if="entry.summary && !journalDetail?.contentMarkdown" class="text-sm text-[#1D1C1A] leading-relaxed whitespace-pre-line">
            {{ entry.summary }}
          </p>

          <!-- Journal Markdown Detail -->
          <div v-if="isLoadingDetail" class="py-6 flex items-center justify-center text-xs font-mono text-[#9E9B93] gap-2">
            <Loader2Icon class="w-4 h-4 animate-spin text-[#C25438]" />
            <span>正在调阅档案卷宗...</span>
          </div>

          <div v-else-if="journalDetail" class="rounded-2xl border border-[#E5E1D8] bg-white p-6 space-y-4">
            <div class="flex flex-wrap items-center gap-3 text-[11px] font-mono text-[#747169] border-b border-[#F0ECE1] pb-3">
              <span v-if="journalDetail.mood">心境: {{ journalDetail.mood }}</span>
              <span v-if="journalDetail.weather">天气: {{ journalDetail.weather }}</span>
              <span>字数: {{ journalDetail.wordCount }}</span>
            </div>
            <div
              class="text-[15px] leading-relaxed"
              v-html="renderMarkdown(journalDetail.contentMarkdown)"
            ></div>
          </div>

          <!-- Trip Map & Stops Detail -->
          <div v-else-if="tripDetail" class="space-y-4">
            <div class="rounded-2xl border border-[#E5E1D8] bg-white p-2.5">
              <LeafletMap
                :markers="tripMarkers"
                :polyline="tripPolyline"
                height="280px"
              />
            </div>
            <div class="rounded-2xl border border-[#E5E1D8] bg-white p-4 space-y-2 text-xs">
              <div class="flex items-center justify-between font-mono text-[#747169]">
                <span>{{ tripDetail.citySummary || '旅行路线' }}</span>
                <span class="text-[#4E6053] font-semibold">总里程 {{ (tripDetail.distanceKm || 0).toFixed(1) }} km</span>
              </div>
              <div v-if="tripDetail.locations?.length" class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                <div
                  v-for="(loc, idx) in tripDetail.locations"
                  :key="loc.id"
                  class="rounded-xl bg-[#F7F5F0] border border-[#E5E1D8] px-3 py-2"
                >
                  <div class="font-medium text-[#1D1C1A]">{{ idx + 1 }}. {{ loc.name }}</div>
                  <div v-if="loc.notes" class="text-[11px] text-[#747169] mt-0.5">{{ loc.notes }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tags -->
          <div v-if="entry.tags && entry.tags.length > 0" class="flex flex-wrap gap-1.5">
            <span
              v-for="tag in entry.tags"
              :key="tag"
              class="rounded-md bg-white px-2.5 py-1 text-[11px] font-mono text-[#747169] border border-[#E5E1D8]"
            >
              #{{ tag }}
            </span>
          </div>

          <!-- Comments Section -->
          <section class="border-t border-[#E5E1D8] pt-6 space-y-4">
            <div class="flex items-center justify-between">
              <h4 class="font-serif text-base font-medium text-[#1D1C1A] flex items-center gap-2">
                <MessageSquareIcon class="w-4 h-4 text-[#C25438]" />
                <span>访客留言 ({{ comments.length }})</span>
              </h4>
            </div>

            <!-- Post Comment Form -->
            <form @submit.prevent="handlePostComment" class="rounded-2xl border border-[#E5E1D8] bg-white p-4 space-y-3 text-xs">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  v-model="commentForm.authorName"
                  type="text"
                  required
                  placeholder="昵称 *"
                  class="rounded-xl bg-[#F7F5F0] border border-[#E5E1D8] px-3 py-2 text-[#1D1C1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#C25438]/60"
                />
                <input
                  v-model="commentForm.authorEmail"
                  type="email"
                  required
                  placeholder="邮箱 (不公开) *"
                  class="rounded-xl bg-[#F7F5F0] border border-[#E5E1D8] px-3 py-2 text-[#1D1C1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#C25438]/60"
                />
                <input
                  v-model="commentForm.authorUrl"
                  type="url"
                  placeholder="个人主页 (可选)"
                  class="rounded-xl bg-[#F7F5F0] border border-[#E5E1D8] px-3 py-2 text-[#1D1C1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#C25438]/60"
                />
              </div>
              <textarea
                v-model="commentForm.content"
                rows="2"
                required
                placeholder="留下你的观展随感..."
                class="w-full rounded-xl bg-[#F7F5F0] border border-[#E5E1D8] px-3 py-2 text-[#1D1C1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#C25438]/60"
              ></textarea>
              <div class="flex justify-end">
                <button
                  type="submit"
                  :disabled="isPostingComment"
                  class="inline-flex items-center gap-1.5 rounded-xl bg-[#1D1C1A] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#C25438] transition-colors disabled:opacity-50"
                >
                  <Loader2Icon v-if="isPostingComment" class="w-3 h-3 animate-spin" />
                  <span>发表留言</span>
                </button>
              </div>
            </form>

            <!-- Comment List -->
            <div v-if="comments.length === 0" class="text-xs text-[#9E9B93] font-mono py-2">
              暂无访客留言，欢迎留下第一条足迹。
            </div>
            <div v-else class="space-y-2.5">
              <div
                v-for="comment in comments"
                :key="comment.id"
                class="rounded-xl border border-[#E5E1D8] bg-white p-3.5 text-xs space-y-1.5"
              >
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-[#1D1C1A]">{{ comment.authorName }}</span>
                    <span class="font-mono text-[10px] text-[#9E9B93]">
                      {{ formatRelativeTime(comment.createdAt) }}
                    </span>
                  </div>
                  <div v-if="isAdmin" class="flex items-center gap-1.5">
                    <button
                      type="button"
                      class="text-[10px] font-mono text-[#747169] hover:text-[#C25438]"
                      @click="handleMarkSpam(comment.id)"
                    >
                      标为垃圾
                    </button>
                    <button
                      type="button"
                      class="text-[10px] font-mono text-[#747169] hover:text-red-600"
                      @click="handleDeleteComment(comment.id)"
                    >
                      删除
                    </button>
                  </div>
                </div>
                <p class="text-[#5C5951] leading-relaxed whitespace-pre-line">{{ comment.content }}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  X as XIcon,
  Pencil as PencilIcon,
  Loader2 as Loader2Icon,
  MessageSquare as MessageSquareIcon,
} from 'lucide-vue-next';
import { apiClient } from '@/shared/api/client';
import { useUiStore } from '@/shared/stores/ui.store';
import { renderMarkdown } from '@/shared/utils/markdown';
import LeafletMap, { type MapMarker } from '@/shared/components/map/LeafletMap.vue';
import { formatDateTime, formatRelativeTime } from '@archive/shared';
import type { EntryDto, CommentDto } from '@archive/contracts';

const props = defineProps<{
  modelValue: boolean;
  entry: EntryDto | null;
  isAdmin: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'edit', entry: EntryDto): void;
}>();

const uiStore = useUiStore();

const isLoadingDetail = ref(false);
const journalDetail = ref<any>(null);
const tripDetail = ref<any>(null);
const comments = ref<CommentDto[]>([]);
const isPostingComment = ref(false);

const commentForm = ref({
  authorName: '',
  authorEmail: '',
  authorUrl: '',
  content: '',
});

const typeLabel = computed(() => {
  switch (props.entry?.type) {
    case 'trip':
      return '旅行足迹 · EXPEDITION';
    case 'journal':
      return '随想手札 · ESSAY';
    case 'photo':
      return '摄影胶片 · PLATE';
    default:
      return '档案记忆 · RECORD';
  }
});

const tripMarkers = computed<MapMarker[]>(() => {
  if (!tripDetail.value?.locations) return [];
  return tripDetail.value.locations.map((loc: any) => ({
    id: loc.id,
    lat: loc.latitude,
    lng: loc.longitude,
    title: loc.name,
    description: loc.notes ?? undefined,
  }));
});

const tripPolyline = computed<[number, number][]>(() => {
  if (!tripDetail.value?.locations || tripDetail.value.locations.length < 2) return [];
  return tripDetail.value.locations.map((loc: any) => [loc.latitude, loc.longitude]);
});

function close() {
  emit('update:modelValue', false);
}

async function loadDetails(entry: EntryDto) {
  journalDetail.value = null;
  tripDetail.value = null;
  comments.value = [];
  isLoadingDetail.value = true;

  try {
    const tasks: Promise<void>[] = [];

    if (entry.type === 'journal') {
      tasks.push(
        apiClient
          .get(`/api/v1/journals/${entry.id}`)
          .then((d) => {
            journalDetail.value = d;
          })
          .catch(() => {})
      );
    } else if (entry.type === 'trip') {
      tasks.push(
        apiClient
          .get(`/api/v1/trips/${entry.id}`)
          .then((d) => {
            tripDetail.value = d;
          })
          .catch(() => {})
      );
    }

    tasks.push(
      apiClient
        .getPaginated<CommentDto>(`/api/v1/entries/${entry.id}/comments`)
        .then((res) => {
          comments.value = res.items;
        })
        .catch(() => {})
    );

    await Promise.all(tasks);
  } finally {
    isLoadingDetail.value = false;
  }
}

async function handlePostComment() {
  if (!props.entry) return;
  isPostingComment.value = true;
  try {
    const created = await apiClient.post<CommentDto>(
      `/api/v1/entries/${props.entry.id}/comments`,
      {
        authorName: commentForm.value.authorName.trim(),
        authorEmail: commentForm.value.authorEmail.trim(),
        authorUrl: commentForm.value.authorUrl.trim() || null,
        content: commentForm.value.content.trim(),
      }
    );
    comments.value.unshift(created);
    commentForm.value.content = '';
    uiStore.notifySuccess('留言已发布');
  } catch (err: any) {
    uiStore.notifyError(err?.message || '留言发布失败');
  } finally {
    isPostingComment.value = false;
  }
}

async function handleMarkSpam(commentId: string) {
  try {
    await apiClient.put(`/api/v1/comments/${commentId}/status`, { status: 'spam' });
    comments.value = comments.value.filter((c) => c.id !== commentId);
    uiStore.notifyInfo('已隐藏该条留言');
  } catch (err: any) {
    uiStore.notifyError(err?.message || '操作失败');
  }
}

async function handleDeleteComment(commentId: string) {
  try {
    await apiClient.delete(`/api/v1/comments/${commentId}`);
    comments.value = comments.value.filter((c) => c.id !== commentId);
    uiStore.notifySuccess('留言已删除');
  } catch (err: any) {
    uiStore.notifyError(err?.message || '删除失败');
  }
}

watch(
  () => [props.modelValue, props.entry?.id],
  ([open]) => {
    if (open && props.entry) {
      loadDetails(props.entry);
    }
  }
);
</script>
