<template>
  <Teleport to="body">
    <div
      v-if="modelValue && entry"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="fixed inset-0 bg-[#161513]/55 backdrop-blur-xs transition-opacity"
        @click="close"
      ></div>

      <div
        class="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-[2px] border border-[#DDD6C9] bg-[#FAF8F4] shadow-[0_32px_80px_-20px_rgba(22,21,19,0.45)] overflow-hidden"
      >
        <!-- Editorial Header -->
        <div class="flex items-start justify-between gap-4 border-b border-[#DDD6C9] bg-[#F3EFE7]/80 px-6 sm:px-10 py-6">
          <div class="min-w-0 space-y-2">
            <div class="flex flex-wrap items-center gap-2.5 kicker-caps text-[#787268]">
              <span class="text-[#9A3F2B]">{{ typeLabel }}</span>
              <span class="text-[#C4BBA9]">/</span>
              <span class="tabular-nums">{{ formatDateTime(entry.occurredAt, false) }}</span>
              <span v-if="entry.visibility === 'private'" class="text-[#9A6B2F]">· PRIVATE</span>
              <span v-if="entry.status === 'draft'" class="text-[#9B9488]">· DRAFT</span>
            </div>
            <h2 class="font-serif text-2xl sm:text-3xl font-normal text-[#161513] leading-[1.35]">
              {{ entry.title }}
            </h2>
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <button
              v-if="isAdmin"
              type="button"
              class="p-2 text-[#787268] hover:text-[#9A3F2B] transition-colors"
              @click="emit('edit', entry); close()"
              title="编辑条目"
            >
              <PencilIcon class="w-4 h-4" />
            </button>
            <button
              type="button"
              class="p-2 text-[#787268] hover:text-[#161513] transition-colors"
              @click="close"
            >
              <XIcon class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- Scrollable Archival Body -->
        <div class="flex-1 overflow-y-auto px-6 sm:px-10 py-8 space-y-8">
          <!-- Framed Cover Photo -->
          <div
            v-if="entry.coverUrl"
            class="passe-partout p-3 bg-[#F3EFE7]/50"
          >
            <img
              :src="entry.coverUrl"
              :alt="entry.title"
              class="w-full max-h-[440px] object-contain bg-[#EAE4D8]"
            />
          </div>

          <!-- Summary -->
          <p v-if="entry.summary && !journalDetail?.contentMarkdown" class="font-serif text-[15px] text-[#262420] leading-[1.95] whitespace-pre-line font-light">
            {{ entry.summary }}
          </p>

          <!-- Journal Markdown Detail -->
          <div v-if="isLoadingDetail" class="py-8 flex items-center justify-center text-xs font-mono text-[#9B9488] gap-2.5 tracking-widest uppercase">
            <Loader2Icon class="w-4 h-4 animate-spin text-[#9A3F2B]" />
            <span>Retrieving Archival Folio...</span>
          </div>

          <div v-else-if="journalDetail" class="space-y-5">
            <div class="flex flex-wrap items-center gap-4 kicker-caps text-[#787268] border-b border-[#E8E2D6] pb-3">
              <span v-if="journalDetail.mood" class="text-[#9A3F2B]">心境 · {{ journalDetail.mood }}</span>
              <span v-if="journalDetail.weather">天色 · {{ journalDetail.weather }}</span>
              <span class="tabular-nums">{{ journalDetail.wordCount }} WORDS</span>
            </div>
            <div
              class="text-[15.5px]"
              v-html="renderMarkdown(journalDetail.contentMarkdown)"
            ></div>
          </div>

          <!-- Trip Map & Stops Detail -->
          <div v-else-if="tripDetail" class="space-y-5">
            <div class="passe-partout p-3">
              <LeafletMap
                :markers="tripMarkers"
                :polyline="tripPolyline"
                height="280px"
              />
            </div>
            <div class="border-t border-[#DDD6C9] pt-4 space-y-3 text-xs">
              <div class="flex items-baseline justify-between">
                <span class="font-serif text-sm text-[#161513]">{{ tripDetail.citySummary || '旅行路线' }}</span>
                <span class="font-display italic text-xl text-[#3D4E42] tabular-nums">
                  {{ (tripDetail.distanceKm || 0).toFixed(1) }} <span class="text-xs font-mono not-italic text-[#787268]">km</span>
                </span>
              </div>
              <div v-if="tripDetail.locations?.length" class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div
                  v-for="(loc, idx) in tripDetail.locations"
                  :key="loc.id"
                  class="border border-[#DDD6C9] bg-[#F3EFE7]/60 px-3.5 py-2.5 rounded-[2px]"
                >
                  <div class="font-serif text-[#161513]">
                    <span class="font-display italic text-[#9A3F2B] mr-1.5">{{ String(idx + 1).padStart(2, '0') }}</span>
                    {{ loc.name }}
                  </div>
                  <div v-if="loc.notes" class="text-[11px] text-[#57534C] mt-1 font-light">{{ loc.notes }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tags -->
          <div v-if="entry.tags && entry.tags.length > 0" class="flex flex-wrap gap-3 pt-1">
            <span
              v-for="tag in entry.tags"
              :key="tag"
              class="text-[11px] font-mono text-[#787268]"
            >
              #{{ tag }}
            </span>
          </div>

          <!-- Guestbook / Comments Section -->
          <section class="border-t border-[#DDD6C9] pt-8 space-y-5">
            <div class="flex items-baseline justify-between">
              <div class="flex items-baseline gap-2.5">
                <h4 class="font-serif text-lg font-normal text-[#161513]">观展题记</h4>
                <span class="font-display italic text-sm text-[#9B9488]">Guestbook ({{ comments.length }})</span>
              </div>
            </div>

            <!-- Post Comment Form -->
            <form @submit.prevent="handlePostComment" class="border border-[#DDD6C9] bg-[#F3EFE7]/60 p-5 space-y-3.5 text-xs rounded-[2px]">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  v-model="commentForm.authorName"
                  type="text"
                  required
                  placeholder="署名 *"
                  class="editorial-field px-3 py-2"
                />
                <input
                  v-model="commentForm.authorEmail"
                  type="email"
                  required
                  placeholder="邮箱 (不公开) *"
                  class="editorial-field px-3 py-2"
                />
                <input
                  v-model="commentForm.authorUrl"
                  type="url"
                  placeholder="个人主页 (可选)"
                  class="editorial-field px-3 py-2"
                />
              </div>
              <textarea
                v-model="commentForm.content"
                rows="2"
                required
                placeholder="留下你的观展随感..."
                class="w-full editorial-field px-3 py-2"
              ></textarea>
              <div class="flex justify-end">
                <button
                  type="submit"
                  :disabled="isPostingComment"
                  class="inline-flex items-center gap-2 rounded-[2px] bg-[#161513] px-5 py-2 text-xs font-serif tracking-[0.14em] text-[#FAF8F4] hover:bg-[#9A3F2B] transition-colors disabled:opacity-50"
                >
                  <Loader2Icon v-if="isPostingComment" class="w-3 h-3 animate-spin" />
                  <span>落款留言</span>
                </button>
              </div>
            </form>

            <!-- Comment List -->
            <div v-if="comments.length === 0" class="text-xs text-[#9B9488] font-serif py-2">
              暂无观展题记，欢迎留下第一笔足迹。
            </div>
            <div v-else class="divide-y divide-[#E8E2D6] border-t border-[#E8E2D6]">
              <div
                v-for="comment in comments"
                :key="comment.id"
                class="py-4 text-xs space-y-1.5"
              >
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-baseline gap-2.5">
                    <span class="font-serif text-[13px] font-medium text-[#161513]">{{ comment.authorName }}</span>
                    <span class="font-mono text-[10px] text-[#9B9488]">
                      {{ formatRelativeTime(comment.createdAt) }}
                    </span>
                  </div>
                  <div v-if="isAdmin" class="flex items-center gap-3">
                    <button
                      type="button"
                      class="text-[10px] font-mono text-[#787268] hover:text-[#9A3F2B]"
                      @click="handleMarkSpam(comment.id)"
                    >
                      标为垃圾
                    </button>
                    <button
                      type="button"
                      class="text-[10px] font-mono text-[#787268] hover:text-[#9A3F2B]"
                      @click="handleDeleteComment(comment.id)"
                    >
                      删除
                    </button>
                  </div>
                </div>
                <p class="font-serif text-[13.5px] text-[#57534C] leading-[1.85] whitespace-pre-line font-light">{{ comment.content }}</p>
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
      return 'EXPEDITION';
    case 'journal':
      return 'CAHIER';
    case 'photo':
      return 'PLATE';
    default:
      return 'ARCHIVE';
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
