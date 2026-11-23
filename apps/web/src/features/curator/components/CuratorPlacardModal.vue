<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="uiStore.isCuratorModalOpen"
        class="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="curator-placard-title"
      >
        <div
          class="fixed inset-0 bg-[#161513]/55 backdrop-blur-xs"
          @click="handleClose"
        ></div>

        <div
          class="relative w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-[2px] border border-[var(--rule)] bg-[var(--alabaster)] text-[var(--ink)] shadow-[0_28px_64px_-24px_rgba(22,21,19,0.38)]"
        >
          <!-- Placard Top Rule & Header -->
          <div class="sticky top-0 z-10 px-6 sm:px-8 py-4 border-b border-[var(--rule)] archival-glass flex items-center justify-between gap-4">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="w-1.5 h-1.5 rounded-full bg-[#9A3F2B] shrink-0"></span>
              <span class="kicker-caps text-[#9A3F2B] truncate">CURATOR PLACARD · 馆主展签</span>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <button
                v-if="authStore.isAdmin && !isLoading && !isEditing"
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-[2px] border border-[var(--rule-strong)] text-[11px] font-serif tracking-[0.12em] text-[var(--ink-secondary)] hover:text-[#9A3F2B] hover:border-[#9A3F2B]/50 transition-colors"
                @click="startEdit"
              >
                <PencilIcon class="w-3 h-3" />
                <span>编辑展签</span>
              </button>
              <button
                type="button"
                class="p-1.5 text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
                aria-label="关闭展签"
                @click="handleClose"
              >
                <XIcon class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Loading Skeleton -->
          <div v-if="isLoading" class="p-6 sm:p-8 space-y-6 animate-pulse">
            <div class="space-y-3">
              <div class="h-7 w-40 bg-[#EAE4D8] rounded-[2px]"></div>
              <div class="h-4 w-28 bg-[#EAE4D8] rounded-[2px]"></div>
            </div>
            <div class="h-16 bg-[#EAE4D8]/60 rounded-[2px]"></div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div class="h-28 bg-[#EAE4D8]/55 rounded-[2px]"></div>
              <div class="h-28 bg-[#EAE4D8]/55 rounded-[2px]"></div>
            </div>
          </div>

          <!-- Error Fallback -->
          <div v-else-if="loadError" class="p-8 text-center space-y-4">
            <p class="font-serif text-sm text-[var(--ink-secondary)]">{{ loadError }}</p>
            <button
              type="button"
              class="px-4 py-1.5 rounded-[2px] border border-[var(--rule-strong)] text-xs font-serif tracking-wider hover:border-[#9A3F2B] hover:text-[#9A3F2B] transition-colors"
              @click="fetchProfile"
            >
              重新读取展签
            </button>
          </div>

          <!-- Read-Only Curator Placard View -->
          <div v-else-if="!isEditing && profile" class="p-6 sm:p-8 space-y-7">
            <!-- Identity & Status -->
            <div class="space-y-4">
              <div class="flex items-start justify-between gap-4">
                <div class="flex items-center gap-4 min-w-0">
                  <img
                    v-if="safeUrl(profile.avatarUrl)"
                    :src="safeUrl(profile.avatarUrl)!"
                    :alt="profile.name"
                    class="w-12 h-12 rounded-[2px] object-cover border border-[var(--rule)] shrink-0"
                  />
                  <div class="min-w-0">
                    <h2 id="curator-placard-title" class="font-serif text-2xl font-normal tracking-[0.04em] text-[var(--ink)] truncate">
                      {{ profile.name }}
                    </h2>
                    <p v-if="profile.location" class="mt-1 inline-flex items-center gap-1.5 font-mono text-[11px] text-[var(--ink-muted)]">
                      <MapPinIcon class="w-3 h-3 text-[#3D4E42]" />
                      <span>{{ profile.location }}</span>
                    </p>
                  </div>
                </div>
                <span class="font-display italic text-xl text-[var(--ink-dim)] select-none shrink-0">Curator</span>
              </div>

              <div
                v-if="profile.statusText"
                class="px-4 py-3 rounded-[2px] border border-[var(--rule)] bg-[var(--canvas)]/70 flex items-start gap-2.5"
              >
                <span class="kicker-caps text-[#3D4E42] shrink-0 mt-0.5">NOW</span>
                <p class="font-serif text-xs sm:text-[13px] leading-relaxed text-[var(--ink)]">
                  {{ profile.statusText }}
                </p>
              </div>

              <p
                v-if="profile.bio"
                class="font-serif text-[13.5px] leading-[1.9] text-[var(--ink-secondary)] whitespace-pre-line font-light"
              >
                {{ profile.bio }}
              </p>
            </div>

            <!-- Currently Reading -->
            <div
              v-if="profile.currentlyReading"
              class="pt-5 border-t border-[var(--rule)] flex items-baseline justify-between gap-4 flex-wrap"
            >
              <span class="inline-flex items-center gap-2 kicker-caps text-[var(--ink-muted)]">
                <BookOpenIcon class="w-3.5 h-3.5 text-[#9A3F2B]" />
                <span>案头在读 · READING</span>
              </span>
              <span class="font-serif text-sm text-[var(--ink)]">{{ profile.currentlyReading }}</span>
            </div>

            <!-- Two-Column Shelf: Recent Anime & Loop Playlist -->
            <div class="pt-5 border-t border-[var(--rule)] grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Recent Anime -->
              <section class="space-y-3">
                <div class="flex items-center gap-2 kicker-caps text-[var(--ink-muted)]">
                  <TvIcon class="w-3.5 h-3.5 text-[#9A3F2B]" />
                  <span>最近在看的番 · ANIME</span>
                </div>
                <ul v-if="profile.recentAnime.length > 0" class="space-y-2.5">
                  <li
                    v-for="(item, idx) in profile.recentAnime"
                    :key="`anime-${idx}`"
                    class="p-3 rounded-[2px] border border-[var(--rule)] bg-[var(--canvas)]/50 space-y-1"
                  >
                    <div class="flex items-baseline justify-between gap-2">
                      <span class="font-serif text-[13px] text-[var(--ink)] font-medium">{{ item.title }}</span>
                      <span v-if="item.progress || item.status" class="font-mono text-[10px] text-[#3D4E42] shrink-0">
                        {{ [item.status, item.progress].filter(Boolean).join(' · ') }}
                      </span>
                    </div>
                    <p v-if="item.note" class="text-[11.5px] text-[var(--ink-muted)] leading-relaxed font-light">
                      {{ item.note }}
                    </p>
                  </li>
                </ul>
                <p v-else class="text-xs text-[var(--ink-dim)] font-serif italic">暂未登记在看番目</p>
              </section>

              <!-- Loop Playlist -->
              <section class="space-y-3">
                <div class="flex items-center gap-2 kicker-caps text-[var(--ink-muted)]">
                  <Disc3Icon class="w-3.5 h-3.5 text-[#3D4E42]" />
                  <span>循环歌单 · ON REPEAT</span>
                </div>
                <ul v-if="profile.loopPlaylist.length > 0" class="space-y-2.5">
                  <li
                    v-for="(track, idx) in profile.loopPlaylist"
                    :key="`track-${idx}`"
                    class="p-3 rounded-[2px] border border-[var(--rule)] bg-[var(--canvas)]/50 space-y-1"
                  >
                    <div class="flex items-baseline justify-between gap-2">
                      <a
                        v-if="safeUrl(track.url)"
                        :href="safeUrl(track.url)!"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="font-serif text-[13px] text-[var(--ink)] hover:text-[#9A3F2B] underline decoration-[var(--rule-strong)] underline-offset-4 transition-colors"
                      >
                        {{ track.title }}
                      </a>
                      <span v-else class="font-serif text-[13px] text-[var(--ink)]">{{ track.title }}</span>
                      <span v-if="track.artist" class="font-mono text-[10px] text-[var(--ink-muted)] truncate max-w-[45%]">
                        {{ track.artist }}
                      </span>
                    </div>
                    <p v-if="track.note" class="text-[11.5px] text-[var(--ink-muted)] leading-relaxed font-light">
                      {{ track.note }}
                    </p>
                  </li>
                </ul>
                <p v-else class="text-xs text-[var(--ink-dim)] font-serif italic">暂未登记循环曲目</p>
              </section>
            </div>

            <!-- Colophon Footer -->
            <div class="pt-4 border-t border-[var(--rule)] flex items-center justify-between text-[10px] font-mono tracking-[0.14em] text-[var(--ink-dim)]">
              <span>PERSONAL ARCHIVE · CURATOR NOTE</span>
              <span v-if="profile.updatedAt">UPDATED {{ formatTimestamp(profile.updatedAt) }}</span>
            </div>
          </div>

          <!-- Admin Lightweight Edit Form -->
          <form v-else class="p-6 sm:p-8 space-y-5" @submit.prevent="saveProfile">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label class="block space-y-1.5">
                <span class="kicker-caps text-[var(--ink-muted)]">馆主称谓 *</span>
                <input
                  v-model="draft.name"
                  type="text"
                  required
                  maxlength="100"
                  class="w-full editorial-field px-3 py-2 text-xs"
                />
              </label>
              <label class="block space-y-1.5">
                <span class="kicker-caps text-[var(--ink-muted)]">坐标 / 驻地</span>
                <input
                  v-model="draft.location"
                  type="text"
                  maxlength="100"
                  placeholder="如：北京 / 杭州"
                  class="w-full editorial-field px-3 py-2 text-xs"
                />
              </label>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label class="block space-y-1.5">
                <span class="kicker-caps text-[var(--ink-muted)]">此刻近况</span>
                <input
                  v-model="draft.statusText"
                  type="text"
                  maxlength="300"
                  placeholder="整理旧胶片与随想手札中…"
                  class="w-full editorial-field px-3 py-2 text-xs"
                />
              </label>
              <label class="block space-y-1.5">
                <span class="kicker-caps text-[var(--ink-muted)]">案头在读</span>
                <input
                  v-model="draft.currentlyReading"
                  type="text"
                  maxlength="200"
                  placeholder="书名 / 作者"
                  class="w-full editorial-field px-3 py-2 text-xs"
                />
              </label>
            </div>

            <label class="block space-y-1.5">
              <span class="kicker-caps text-[var(--ink-muted)]">馆主自述</span>
              <textarea
                v-model="draft.bio"
                rows="3"
                maxlength="2000"
                class="w-full editorial-field px-3 py-2 text-xs leading-relaxed"
              ></textarea>
            </label>

            <!-- Recent Anime Editor -->
            <div class="space-y-2.5 pt-2 border-t border-[var(--rule)]">
              <div class="flex items-center justify-between">
                <span class="kicker-caps text-[var(--ink-muted)]">最近在看的番</span>
                <button
                  type="button"
                  class="inline-flex items-center gap-1 text-[11px] font-serif text-[#9A3F2B] hover:underline"
                  @click="addAnimeRow"
                >
                  <PlusIcon class="w-3 h-3" />
                  <span>添加一部</span>
                </button>
              </div>
              <div
                v-for="(item, idx) in draft.recentAnime"
                :key="`edit-anime-${idx}`"
                class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2.5 rounded-[2px] border border-[var(--rule)] bg-[var(--canvas)]/40"
              >
                <input
                  v-model="item.title"
                  type="text"
                  placeholder="番剧名称 *"
                  class="sm:col-span-4 editorial-field px-2.5 py-1.5 text-xs"
                />
                <input
                  v-model="item.progress"
                  type="text"
                  placeholder="进度 (如 Ep.08)"
                  class="sm:col-span-3 editorial-field px-2.5 py-1.5 text-xs"
                />
                <input
                  v-model="item.note"
                  type="text"
                  placeholder="短评"
                  class="sm:col-span-4 editorial-field px-2.5 py-1.5 text-xs"
                />
                <button
                  type="button"
                  class="sm:col-span-1 justify-self-end p-1 text-[var(--ink-muted)] hover:text-[#9A3F2B]"
                  title="移除"
                  @click="draft.recentAnime.splice(idx, 1)"
                >
                  <Trash2Icon class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <!-- Loop Playlist Editor -->
            <div class="space-y-2.5 pt-2 border-t border-[var(--rule)]">
              <div class="flex items-center justify-between">
                <span class="kicker-caps text-[var(--ink-muted)]">循环歌单</span>
                <button
                  type="button"
                  class="inline-flex items-center gap-1 text-[11px] font-serif text-[#3D4E42] hover:underline"
                  @click="addTrackRow"
                >
                  <PlusIcon class="w-3 h-3" />
                  <span>添加一曲</span>
                </button>
              </div>
              <div
                v-for="(track, idx) in draft.loopPlaylist"
                :key="`edit-track-${idx}`"
                class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2.5 rounded-[2px] border border-[var(--rule)] bg-[var(--canvas)]/40"
              >
                <input
                  v-model="track.title"
                  type="text"
                  placeholder="曲目 *"
                  class="sm:col-span-4 editorial-field px-2.5 py-1.5 text-xs"
                />
                <input
                  v-model="track.artist"
                  type="text"
                  placeholder="音乐人"
                  class="sm:col-span-3 editorial-field px-2.5 py-1.5 text-xs"
                />
                <input
                  v-model="track.note"
                  type="text"
                  placeholder="附言"
                  class="sm:col-span-4 editorial-field px-2.5 py-1.5 text-xs"
                />
                <button
                  type="button"
                  class="sm:col-span-1 justify-self-end p-1 text-[var(--ink-muted)] hover:text-[#9A3F2B]"
                  title="移除"
                  @click="draft.loopPlaylist.splice(idx, 1)"
                >
                  <Trash2Icon class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <!-- Save / Cancel Actions -->
            <div class="pt-4 border-t border-[var(--rule)] flex items-center justify-end gap-3">
              <button
                type="button"
                class="px-4 py-2 text-xs font-serif tracking-wider text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
                :disabled="isSaving"
                @click="isEditing = false"
              >
                取消
              </button>
              <button
                type="submit"
                class="px-5 py-2 rounded-[2px] bg-[#161513] text-xs font-serif tracking-[0.14em] text-[#FAF8F4] hover:bg-[#9A3F2B] transition-colors disabled:opacity-50"
                :disabled="isSaving"
              >
                {{ isSaving ? '保存中…' : '保存展签' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import type {
  CuratorProfileDto,
  CuratorRecentAnimeItem,
  CuratorPlaylistTrack,
} from '@archive/contracts';
import {
  X as XIcon,
  Pencil as PencilIcon,
  MapPin as MapPinIcon,
  BookOpen as BookOpenIcon,
  Tv as TvIcon,
  Disc3 as Disc3Icon,
  Plus as PlusIcon,
  Trash2 as Trash2Icon,
} from 'lucide-vue-next';
import { apiClient } from '@/shared/api/client';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { useUiStore } from '@/shared/stores/ui.store';

const authStore = useAuthStore();
const uiStore = useUiStore();

const profile = ref<CuratorProfileDto | null>(null);
const isLoading = ref(false);
const loadError = ref<string | null>(null);
const isEditing = ref(false);
const isSaving = ref(false);

const draft = ref<{
  name: string;
  location: string;
  statusText: string;
  currentlyReading: string;
  bio: string;
  recentAnime: CuratorRecentAnimeItem[];
  loopPlaylist: CuratorPlaylistTrack[];
}>({
  name: '',
  location: '',
  statusText: '',
  currentlyReading: '',
  bio: '',
  recentAnime: [],
  loopPlaylist: [],
});

function safeUrl(candidate?: string | null): string | null {
  if (!candidate) return null;
  const trimmed = candidate.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) {
    return trimmed;
  }
  return null;
}

function formatTimestamp(ms: number): string {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(ms));
  } catch {
    return '';
  }
}

async function fetchProfile(): Promise<void> {
  isLoading.value = true;
  loadError.value = null;
  try {
    profile.value = await apiClient.getCuratorProfile();
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : '无法读取馆主展签信息';
  } finally {
    isLoading.value = false;
  }
}

function startEdit(): void {
  if (!profile.value) return;
  draft.value = {
    name: profile.value.name,
    location: profile.value.location ?? '',
    statusText: profile.value.statusText ?? '',
    currentlyReading: profile.value.currentlyReading ?? '',
    bio: profile.value.bio ?? '',
    recentAnime: profile.value.recentAnime.map((a) => ({ ...a })),
    loopPlaylist: profile.value.loopPlaylist.map((t) => ({ ...t })),
  };
  isEditing.value = true;
}

function addAnimeRow(): void {
  if (draft.value.recentAnime.length >= 20) return;
  draft.value.recentAnime.push({ title: '', progress: '', note: '' });
}

function addTrackRow(): void {
  if (draft.value.loopPlaylist.length >= 30) return;
  draft.value.loopPlaylist.push({ title: '', artist: '', note: '' });
}

async function saveProfile(): Promise<void> {
  const name = draft.value.name.trim();
  if (!name) {
    uiStore.notifyError('馆主称谓不能为空');
    return;
  }

  isSaving.value = true;
  try {
    const cleanedAnime = draft.value.recentAnime
      .map((item) => ({
        title: item.title.trim(),
        status: item.status?.trim() || undefined,
        progress: item.progress?.trim() || undefined,
        note: item.note?.trim() || undefined,
      }))
      .filter((item) => item.title.length > 0);

    const cleanedPlaylist = draft.value.loopPlaylist
      .map((track) => ({
        title: track.title.trim(),
        artist: track.artist?.trim() || undefined,
        note: track.note?.trim() || undefined,
        url: track.url?.trim() || undefined,
      }))
      .filter((track) => track.title.length > 0);

    profile.value = await apiClient.updateCuratorProfile({
      name,
      bio: draft.value.bio.trim(),
      statusText: draft.value.statusText.trim(),
      location: draft.value.location.trim() || null,
      avatarUrl: profile.value?.avatarUrl ?? null,
      currentlyReading: draft.value.currentlyReading.trim() || null,
      recentAnime: cleanedAnime,
      loopPlaylist: cleanedPlaylist,
    });
    isEditing.value = false;
    uiStore.notifySuccess('馆主展签已更新');
  } catch (err) {
    uiStore.notifyError(err instanceof Error ? err.message : '保存展签失败');
  } finally {
    isSaving.value = false;
  }
}

function handleClose(): void {
  isEditing.value = false;
  uiStore.closeCuratorModal();
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && uiStore.isCuratorModalOpen) {
    handleClose();
  }
}

watch(
  () => uiStore.isCuratorModalOpen,
  (open) => {
    if (open) {
      isEditing.value = false;
      void fetchProfile();
    }
  }
);

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeydown);
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeydown);
  }
});
</script>
