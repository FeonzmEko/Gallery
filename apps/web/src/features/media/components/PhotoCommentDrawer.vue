<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-250 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue && photo"
        class="fixed inset-0 z-[60] flex justify-end items-end sm:items-stretch"
        role="dialog"
        aria-modal="true"
        :aria-label="`${photo.title || '影像'} · 单图批注与光学档案`"
      >
        <!-- Backdrop -->
        <div
          class="fixed inset-0 bg-[#11100F]/50 backdrop-blur-[2px]"
          @click="closeDrawer"
        ></div>

        <!-- Responsive Drawer Panel: Desktop right slide-over / Mobile bottom sheet -->
        <Transition
          appear
          enter-active-class="transition-transform duration-300 ease-gallery"
          enter-from-class="translate-y-full sm:translate-y-0 sm:translate-x-full"
          enter-to-class="translate-y-0 sm:translate-x-0"
          leave-active-class="transition-transform duration-200 ease-in"
          leave-from-class="translate-y-0 sm:translate-x-0"
          leave-to-class="translate-y-full sm:translate-y-0 sm:translate-x-full"
        >
          <aside
            v-if="modelValue && photo"
            class="relative z-10 w-full sm:w-[440px] lg:w-[490px] max-h-[90dvh] sm:max-h-none sm:h-full flex flex-col bg-[var(--alabaster)] text-[var(--ink)] border-t sm:border-t-0 sm:border-l border-[var(--rule)] rounded-t-[8px] sm:rounded-none shadow-[0_-24px_64px_-20px_rgba(17,16,15,0.42)] sm:shadow-[-24px_0_64px_-20px_rgba(17,16,15,0.38)] overflow-hidden"
          >
            <!-- Mobile Sheet Drag Handle -->
            <div class="sm:hidden flex justify-center pt-2.5 pb-1 bg-[var(--canvas)]/80 shrink-0">
              <span class="w-10 h-1 rounded-full bg-[var(--rule-strong)]"></span>
            </div>

            <!-- Drawer Header -->
            <header class="flex items-start justify-between gap-4 px-5 sm:px-6 py-4 border-b border-[var(--rule)] bg-[var(--canvas)]/75 shrink-0">
              <div class="min-w-0 space-y-1">
                <div class="flex items-center gap-2 kicker-caps text-[var(--seal)]">
                  <span>OPTICAL PLATE</span>
                  <span class="text-[var(--rule-strong)]">/</span>
                  <span class="text-[var(--ink-muted)]">NOTES &amp; EXIF</span>
                </div>
                <h2 class="font-serif text-lg sm:text-xl font-normal text-[var(--ink)] truncate">
                  {{ photo.title || '无题印相' }}
                </h2>
              </div>

              <div class="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[2px] border border-[var(--rule)] bg-[var(--alabaster)] text-[11px] font-serif text-[var(--ink-secondary)] hover:text-[var(--ink)] hover:border-[var(--rule-strong)] transition-colors"
                  @click="emit('open-lightbox', photo.id)"
                  title="在全屏暗房看图室打开"
                >
                  <Maximize2Icon class="w-3.5 h-3.5" />
                  <span class="hidden sm:inline">全屏细看</span>
                </button>
                <button
                  type="button"
                  class="p-1.5 rounded-[2px] text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
                  @click="closeDrawer"
                  aria-label="关闭批注抽屉"
                >
                  <XIcon class="w-5 h-5" />
                </button>
              </div>
            </header>

            <!-- Scrollable Drawer Content -->
            <div ref="scrollBodyRef" class="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-6">
              <!-- High-Res Photo Preview -->
              <div
                class="group relative passe-partout p-2.5 rounded-[2px] cursor-pointer"
                @click="emit('open-lightbox', photo.id)"
              >
                <div
                  class="relative overflow-hidden bg-[var(--linen)] flex items-center justify-center"
                  :style="previewAspectStyle"
                >
                  <img
                    :key="photo.url || photo.thumbUrl"
                    :src="photo.url || photo.thumbUrl"
                    :alt="photo.title || '高清影像预览'"
                    class="w-full max-h-[300px] sm:max-h-[340px] object-contain transition-transform duration-500 ease-gallery group-hover:scale-[1.015]"
                  />
                  <span
                    class="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-[#11100F]/75 text-[#FAF8F4] text-[10px] font-mono tracking-[0.12em] opacity-85 group-hover:opacity-100 transition-opacity"
                  >
                    <Maximize2Icon class="w-3 h-3" />
                    <span>VIEWING ROOM</span>
                  </span>
                </div>
              </div>

              <!-- EXIF Optical Specifications -->
              <section class="border border-[var(--rule)] bg-[var(--canvas)]/55 rounded-[2px] p-4 space-y-3.5">
                <div class="flex items-center justify-between gap-2 border-b border-[var(--rule)] pb-2.5">
                  <span class="kicker-caps text-[var(--ink-muted)]">CAMERA &amp; EXPOSURE</span>
                  <span v-if="displayTimestamp" class="font-mono text-[10px] text-[var(--ink-muted)] tabular-nums">
                    {{ displayTimestamp }}
                  </span>
                </div>

                <div class="flex items-baseline justify-between gap-3">
                  <div class="text-xs font-serif text-[var(--ink)]">
                    <span v-if="cameraLabel">{{ cameraLabel }}</span>
                    <span v-else class="text-[var(--ink-muted)]">未记录相机机型参数</span>
                  </div>
                  <span
                    v-if="photo.width && photo.height"
                    class="font-mono text-[10px] text-[var(--ink-muted)] tabular-nums shrink-0"
                  >
                    {{ photo.width }} × {{ photo.height }}
                  </span>
                </div>

                <div class="grid grid-cols-4 border border-[var(--rule)] bg-[var(--alabaster)] divide-x divide-[var(--rule)] text-center">
                  <div class="px-2 py-2.5">
                    <span class="block text-[9px] font-mono tracking-widest text-[var(--ink-muted)] uppercase">Aperture</span>
                    <span class="mt-0.5 block font-display italic text-base text-[var(--seal)] tabular-nums">
                      {{ photo.exif?.fNumber ? `f/${photo.exif.fNumber}` : '—' }}
                    </span>
                  </div>
                  <div class="px-2 py-2.5">
                    <span class="block text-[9px] font-mono tracking-widest text-[var(--ink-muted)] uppercase">Shutter</span>
                    <span class="mt-0.5 block font-display italic text-base text-[var(--ink)] tabular-nums">
                      {{ photo.exif?.exposureTime || '—' }}
                    </span>
                  </div>
                  <div class="px-2 py-2.5">
                    <span class="block text-[9px] font-mono tracking-widest text-[var(--ink-muted)] uppercase">ISO</span>
                    <span class="mt-0.5 block font-display italic text-base text-[var(--ink)] tabular-nums">
                      {{ photo.exif?.iso || '—' }}
                    </span>
                  </div>
                  <div class="px-2 py-2.5">
                    <span class="block text-[9px] font-mono tracking-widest text-[var(--ink-muted)] uppercase">Focal</span>
                    <span class="mt-0.5 block font-display italic text-base text-[var(--ink)] tabular-nums">
                      {{ photo.exif?.focalLength ? `${photo.exif.focalLength}mm` : '—' }}
                    </span>
                  </div>
                </div>
              </section>

              <!-- Single-Photo Comments & Curator Notes -->
              <section class="space-y-4 pb-2">
                <div class="flex items-baseline justify-between border-b border-[var(--rule)] pb-2.5">
                  <div class="flex items-baseline gap-2">
                    <h3 class="font-serif text-base font-normal text-[var(--ink)]">单图批注</h3>
                    <span class="font-display italic text-xs text-[var(--ink-dim)]">
                      Plate Notes ({{ displayCommentCount }})
                    </span>
                  </div>
                  <span
                    v-if="authStore.isAdmin"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-[var(--seal)]/10 border border-[var(--seal)]/30 text-[10px] font-mono text-[var(--seal)]"
                  >
                    策展人模式
                  </span>
                </div>

                <!-- Comment Form -->
                <form
                  @submit.prevent="handleSubmitComment"
                  class="border border-[var(--rule)] bg-[var(--canvas)]/65 p-4 rounded-[2px] space-y-2.5 text-xs"
                >
                  <textarea
                    v-model="form.content"
                    rows="3"
                    required
                    maxlength="2000"
                    :placeholder="
                      authStore.isAdmin
                        ? '写下策展人注或拍摄当时的回忆（将自动高亮标记）...'
                        : '写下关于这张照片的印象与留言...'
                    "
                    class="w-full editorial-field px-3 py-2 text-xs leading-relaxed"
                  ></textarea>

                  <div class="flex flex-col sm:flex-row sm:items-center gap-2.5">
                    <input
                      v-model="form.authorName"
                      type="text"
                      maxlength="50"
                      placeholder="署名（选填，留空默认为匿名）"
                      class="editorial-field flex-1 min-w-0 px-3 py-1.5 text-xs"
                    />
                    <button
                      type="submit"
                      :disabled="isSubmitting"
                      class="inline-flex items-center justify-center gap-1.5 shrink-0 rounded-[2px] bg-[var(--ink)] px-4 py-1.5 text-xs font-serif tracking-[0.12em] text-[var(--alabaster)] hover:bg-[var(--seal)] transition-colors disabled:opacity-50"
                    >
                      <Loader2Icon v-if="isSubmitting" class="w-3 h-3 animate-spin" />
                      <span>{{ authStore.isAdmin ? '落款注记' : '落款留言' }}</span>
                    </button>
                  </div>

                  <p class="text-[10px] font-mono text-[var(--ink-muted)] pt-0.5">
                    {{ authStore.isAdmin ? '登录态发表自动标为「策展人注」' : '仅此张照片独立留言 · 留空默认匿名' }}
                  </p>
                </form>

                <!-- Comments Loading -->
                <div v-if="isLoadingComments" class="space-y-3 py-2">
                  <div
                    v-for="i in 3"
                    :key="i"
                    class="border border-[var(--rule)] bg-[var(--canvas)]/40 p-3.5 rounded-[2px] animate-pulse space-y-2"
                  >
                    <div class="flex justify-between">
                      <div class="h-3 w-20 bg-[var(--linen)]"></div>
                      <div class="h-3 w-12 bg-[var(--linen)]"></div>
                    </div>
                    <div class="h-3 w-5/6 bg-[var(--linen)]"></div>
                  </div>
                </div>

                <!-- Comments Empty -->
                <div
                  v-else-if="comments.length === 0"
                  class="py-8 text-center border border-dashed border-[var(--rule)] rounded-[2px] bg-[var(--canvas)]/30"
                >
                  <MessageSquareIcon class="w-5 h-5 mx-auto text-[var(--ink-dim)] mb-2" />
                  <p class="font-serif text-xs text-[var(--ink-muted)]">
                    此帧尚无观展批注，欢迎留下第一句回忆。
                  </p>
                </div>

                <!-- Comments List -->
                <div v-else class="space-y-3">
                  <article
                    v-for="comment in comments"
                    :key="comment.id"
                    class="rounded-[2px] border p-3.5 text-xs space-y-2 transition-colors"
                    :class="
                      comment.isCuratorNote
                        ? 'border-[var(--seal)]/35 border-l-2 border-l-[var(--seal)] bg-[var(--seal)]/[0.045]'
                        : 'border-[var(--rule)] bg-[var(--canvas)]/45'
                    "
                  >
                    <div class="flex items-center justify-between gap-2">
                      <div class="flex items-center flex-wrap gap-2 min-w-0">
                        <a
                          v-if="comment.authorUrl"
                          :href="comment.authorUrl"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="font-serif text-[13px] font-medium text-[var(--ink)] hover:text-[var(--seal)] underline underline-offset-2 truncate"
                        >
                          {{ comment.authorName }}
                        </a>
                        <span v-else class="font-serif text-[13px] font-medium text-[var(--ink)] truncate">
                          {{ comment.authorName }}
                        </span>

                        <span
                          v-if="comment.isCuratorNote"
                          class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-[var(--seal)]/12 border border-[var(--seal)]/35 text-[9px] font-mono tracking-[0.12em] text-[var(--seal)] shrink-0"
                        >
                          <SparklesIcon class="w-2.5 h-2.5" />
                          <span>策展人注</span>
                        </span>

                        <span class="font-mono text-[10px] text-[var(--ink-dim)] shrink-0">
                          {{ formatRelativeTime(comment.createdAt) }}
                        </span>
                      </div>

                      <button
                        v-if="authStore.isAdmin"
                        type="button"
                        class="text-[10px] font-mono text-[var(--ink-muted)] hover:text-[var(--seal)] shrink-0 transition-colors"
                        @click="handleDeleteComment(comment.id)"
                      >
                        删除
                      </button>
                    </div>

                    <p class="font-serif text-[13.5px] leading-[1.8] text-[var(--ink-secondary)] whitespace-pre-line font-light">
                      {{ comment.content }}
                    </p>
                  </article>

                  <div v-if="hasMoreComments" class="pt-1 text-center">
                    <button
                      type="button"
                      :disabled="isLoadingMore"
                      class="inline-flex items-center gap-2 px-4 py-1.5 rounded-[2px] border border-[var(--rule-strong)] text-[11px] font-serif text-[var(--ink-secondary)] hover:text-[var(--ink)] hover:border-[var(--ink)] transition-colors disabled:opacity-50"
                      @click="loadComments(false)"
                    >
                      <Loader2Icon v-if="isLoadingMore" class="w-3 h-3 animate-spin" />
                      <span>{{ isLoadingMore ? '加载中...' : '展开更早批注' }}</span>
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </aside>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import {
  X as XIcon,
  Maximize2 as Maximize2Icon,
  Loader2 as Loader2Icon,
  MessageSquare as MessageSquareIcon,
  Sparkles as SparklesIcon,
} from 'lucide-vue-next';
import { apiClient } from '@/shared/api/client';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { useUiStore } from '@/shared/stores/ui.store';
import type { LightboxItem } from '@/features/media/components/MediaLightbox.vue';
import type { MediaCommentDto } from '@archive/contracts';
import { formatDateTime, formatRelativeTime } from '@archive/shared';

const VISITOR_STORAGE_KEY = 'archive_photo_comment_visitor';

const props = defineProps<{
  modelValue: boolean;
  photo: (LightboxItem & { commentCount?: number }) | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'open-lightbox', photoId: string): void;
  (e: 'comment-added', payload: { mediaId: string; comment: MediaCommentDto }): void;
  (e: 'comment-deleted', payload: { mediaId: string; commentId: string }): void;
}>();

const authStore = useAuthStore();
const uiStore = useUiStore();

const scrollBodyRef = ref<HTMLElement | null>(null);
const comments = ref<MediaCommentDto[]>([]);
const isLoadingComments = ref(false);
const isLoadingMore = ref(false);
const isSubmitting = ref(false);
const nextCursor = ref<string | null>(null);
const hasMoreComments = ref(false);

const form = ref({
  authorName: '',
  content: '',
});

let previousBodyOverflow: string | null = null;
let commentRequestSeq = 0;

const previewAspectStyle = computed<Record<string, string> | undefined>(() => {
  const w = props.photo?.width;
  const h = props.photo?.height;
  if (w && h && w > 0 && h > 0) {
    return { aspectRatio: `${w} / ${h}`, maxHeight: '340px' };
  }
  return undefined;
});

const cameraLabel = computed(() => {
  const exif = props.photo?.exif;
  if (!exif) return '';
  return [exif.make, exif.model].filter(Boolean).join(' ');
});

const displayTimestamp = computed(() => {
  if (props.photo?.exif?.dateTimeOriginal) {
    return props.photo.exif.dateTimeOriginal;
  }
  if (props.photo?.occurredAt) {
    return formatDateTime(props.photo.occurredAt, false);
  }
  return '';
});

const displayCommentCount = computed(() => {
  if (typeof props.photo?.commentCount === 'number') {
    return Math.max(props.photo.commentCount, comments.value.length);
  }
  return comments.value.length;
});

function prefillAuthorFields() {
  if (authStore.isAdmin) {
    if (!form.value.authorName.trim()) {
      form.value.authorName = '馆主';
    }
    return;
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(VISITOR_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as {
          authorName?: string;
        };
        if (!form.value.authorName && parsed.authorName) form.value.authorName = parsed.authorName;
      }
    }
  } catch {
    // Ignore localStorage access errors
  }
}

function saveVisitorFields() {
  if (authStore.isAdmin) return;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(
        VISITOR_STORAGE_KEY,
        JSON.stringify({
          authorName: form.value.authorName.trim(),
        })
      );
    }
  } catch {
    // Ignore localStorage access errors
  }
}

async function loadComments(reset: boolean = true) {
  const mediaId = props.photo?.id;
  if (!mediaId) return;
  if (!reset && (isLoadingComments.value || isLoadingMore.value)) return;

  const seq = ++commentRequestSeq;
  if (reset) {
    isLoadingComments.value = true;
    nextCursor.value = null;
  } else {
    isLoadingMore.value = true;
  }

  try {
    const res = await apiClient.listMediaComments(mediaId, {
      limit: 20,
      cursor: !reset && nextCursor.value ? nextCursor.value : undefined,
    });
    if (seq !== commentRequestSeq) return;

    comments.value = reset ? res.items : [...comments.value, ...res.items];
    nextCursor.value = res.pagination.cursor;
    hasMoreComments.value = res.pagination.hasMore;
  } catch (err: any) {
    if (seq !== commentRequestSeq) return;
    uiStore.notifyError(err?.message || '加载单图批注失败');
  } finally {
    if (seq === commentRequestSeq) {
      isLoadingComments.value = false;
      isLoadingMore.value = false;
    }
  }
}

async function handleSubmitComment() {
  const mediaId = props.photo?.id;
  const content = form.value.content.trim();
  if (!mediaId || !content || isSubmitting.value) return;

  isSubmitting.value = true;
  try {
    const authorName = form.value.authorName.trim();
    const created = await apiClient.postMediaComment(mediaId, {
      ...(authorName ? { authorName } : {}),
      content,
    });

    saveVisitorFields();
    comments.value = [created, ...comments.value];
    form.value.content = '';
    emit('comment-added', { mediaId, comment: created });
    uiStore.notifySuccess(created.isCuratorNote ? '已落款「策展人注」' : '批注已留存');
  } catch (err: any) {
    uiStore.notifyError(err?.message || '发表批注失败');
  } finally {
    isSubmitting.value = false;
  }
}

async function handleDeleteComment(commentId: string) {
  const mediaId = props.photo?.id;
  if (!mediaId) return;

  const ok = await uiStore.confirm({
    title: '移除单图批注',
    message: '确定要删除这条留言吗？此操作无法撤销。',
    confirmLabel: '确认删除',
    danger: true,
  });
  if (!ok) return;

  try {
    await apiClient.delete(`/api/v1/comments/${encodeURIComponent(commentId)}`);
    comments.value = comments.value.filter((c) => c.id !== commentId);
    emit('comment-deleted', { mediaId, commentId });
    uiStore.notifySuccess('已移除该批注');
  } catch (err: any) {
    uiStore.notifyError(err?.message || '删除批注失败');
  }
}

function closeDrawer() {
  emit('update:modelValue', false);
}

function restoreBodyOverflow() {
  if (typeof document === 'undefined') return;
  if (previousBodyOverflow !== null) {
    document.body.style.overflow = previousBodyOverflow;
    previousBodyOverflow = null;
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (!props.modelValue) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    closeDrawer();
  }
}

watch(
  () => [props.modelValue, props.photo?.id] as const,
  ([isOpen, mediaId]) => {
    if (isOpen && mediaId) {
      if (typeof document !== 'undefined' && previousBodyOverflow === null) {
        previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
      }
      prefillAuthorFields();
      comments.value = [];
      loadComments(true);
      if (scrollBodyRef.value) {
        scrollBodyRef.value.scrollTop = 0;
      }
    } else if (!isOpen) {
      restoreBodyOverflow();
    }
  },
  { immediate: true }
);

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown);
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeyDown);
  }
  restoreBodyOverflow();
});
</script>
