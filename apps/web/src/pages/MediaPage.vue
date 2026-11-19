<template>
  <div class="space-y-6">
    <!-- Page Header & Action Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/60 pb-5">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <ImageIcon class="w-7 h-7 text-emerald-400" />
          <span>媒体长廊</span>
        </h1>
        <p class="mt-1 text-sm text-slate-400">
          全网格自适应画廊与大图灯箱预览 · 预加载 WebP 缩略图与 EXIF 曝光参数
        </p>
      </div>

      <!-- Action Area -->
      <div class="flex items-center gap-3">
        <!-- Search Filter -->
        <div class="relative">
          <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="检索照片或标签..."
            class="w-44 sm:w-56 rounded-xl bg-slate-900 border border-slate-800/80 pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
          />
        </div>

        <!-- Admin Upload Button -->
        <button
          v-if="authStore.isAdmin"
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          @click="isUploaderOpen = true"
        >
          <UploadCloudIcon class="w-4 h-4" />
          <span>并发直传 R2</span>
        </button>
      </div>
    </div>

    <!-- Loading Skeletons -->
    <div v-if="isLoading" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      <div
        v-for="i in 10"
        :key="i"
        class="aspect-square rounded-2xl bg-slate-900/60 border border-slate-800/60 animate-pulse flex items-center justify-center"
      >
        <ImageIcon class="w-8 h-8 text-slate-800" />
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredPhotos.length === 0"
      class="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800/80 bg-slate-900/30 p-12 text-center"
    >
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 mb-4 text-emerald-400/60">
        <ImageIcon class="w-8 h-8" />
      </div>
      <h3 class="text-base font-semibold text-slate-200">暂无媒体照片</h3>
      <p class="mt-1 text-xs text-slate-400 max-w-sm">
        {{ searchQuery ? '未检索到匹配的摄影记录，请尝试其他关键词。' : '媒体长廊目前为空，管理员可通过上方按钮直传照片。' }}
      </p>
      <button
        v-if="authStore.isAdmin && !searchQuery"
        type="button"
        class="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition-colors"
        @click="isUploaderOpen = true"
      >
        <UploadCloudIcon class="w-4 h-4" />
        <span>立即上传第一张照片</span>
      </button>
    </div>

    <!-- Responsive Waterfall Photo Grid -->
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      <div
        v-for="(photo, index) in filteredPhotos"
        :key="photo.id"
        class="group relative aspect-square overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 transition-all duration-300 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1 cursor-pointer"
        @click="openLightbox(index)"
      >
        <!-- Background Image Thumbnail -->
        <img
          :src="photo.thumbUrl || photo.url"
          :alt="photo.title || '画廊照片'"
          loading="lazy"
          class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        <!-- Hover Overlay Gradient -->
        <div
          class="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3"
        >
          <!-- Top Badges -->
          <div class="flex items-center justify-between gap-1">
            <span
              v-if="photo.visibility === 'private'"
              class="rounded-md bg-amber-500/20 text-amber-400 px-1.5 py-0.5 text-[10px] font-mono border border-amber-500/30"
            >
              私密
            </span>
            <span
              v-if="photo.exif?.model"
              class="ml-auto rounded-md bg-slate-900/80 text-slate-300 px-1.5 py-0.5 text-[10px] font-mono truncate max-w-[120px] backdrop-blur-sm"
            >
              {{ photo.exif.model }}
            </span>
          </div>

          <!-- Bottom Meta -->
          <div>
            <h4 class="text-xs font-semibold text-white truncate">{{ photo.title || '照片' }}</h4>
            <div class="mt-0.5 flex items-center justify-between text-[10px] text-slate-400">
              <span>{{ formatOccurredAt(photo.occurredAt) }}</span>
              <span v-if="photo.exif?.fNumber" class="font-mono text-emerald-400">
                f/{{ photo.exif.fNumber }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Fullscreen Lightbox Preview Component -->
    <MediaLightbox
      v-model="isLightboxOpen"
      :items="lightboxItems"
      :initial-index="lightboxIndex"
    />

    <!-- Multi-file Upload Drawer/Modal -->
    <MediaUploader
      v-model="isUploaderOpen"
      @uploaded="handleUploadSuccess"
      @entry-created="handleEntryCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  Image as ImageIcon,
  UploadCloud as UploadCloudIcon,
  Search as SearchIcon,
} from 'lucide-vue-next';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { apiClient } from '@/shared/api/client';
import MediaLightbox, { type LightboxItem } from '@/features/media/components/MediaLightbox.vue';
import MediaUploader from '@/features/media/components/MediaUploader.vue';
import type { EntryDto, MediaAssetDto } from '@archive/contracts';
import { formatDate } from '@archive/shared';

const authStore = useAuthStore();

const isLoading = ref(true);
const photos = ref<LightboxItem[]>([]);
const searchQuery = ref('');

const isLightboxOpen = ref(false);
const lightboxIndex = ref(0);
const isUploaderOpen = ref(false);

const filteredPhotos = computed(() => {
  if (!searchQuery.value.trim()) return photos.value;
  const q = searchQuery.value.trim().toLowerCase();
  return photos.value.filter((p) => {
    const matchTitle = (p.title || '').toLowerCase().includes(q);
    const matchSummary = (p.summary || '').toLowerCase().includes(q);
    const matchTags = (p.tags || []).some((t) => t.toLowerCase().includes(q));
    const matchModel = (p.exif?.model || '').toLowerCase().includes(q);
    return matchTitle || matchSummary || matchTags || matchModel;
  });
});

const lightboxItems = computed(() => filteredPhotos.value);

function openLightbox(index: number) {
  lightboxIndex.value = index;
  isLightboxOpen.value = true;
}

function formatOccurredAt(ts?: number): string {
  if (!ts) return '';
  return formatDate(ts, '.');
}

async function loadGalleryPhotos() {
  isLoading.value = true;
  try {
    // 1. Fetch entries with type=photo
    const entries = await apiClient.get<EntryDto[]>('/api/v1/entries', {
      params: { type: 'photo', limit: 100 },
    });

    const items: LightboxItem[] = [];

    // Map entries to LightboxItems
    for (const entry of entries) {
      let url = entry.coverUrl || '';
      let thumbUrl = entry.coverUrl || '';
      let exif: LightboxItem['exif'] = undefined;

      // If entry has coverMediaId, try to retrieve asset details
      if (entry.coverMediaId) {
        try {
          const media = await apiClient.get<MediaAssetDto>(`/api/v1/media/${entry.coverMediaId}`);
          url = media.originalUrl || url;
          thumbUrl = media.thumbUrl || media.originalUrl || thumbUrl;
          if (media.width && media.height) {
            exif = {
              width: media.width,
              height: media.height,
            };
          }
        } catch {
          // Fallback if media detail fails
        }
      }

      // If summary has camera model clue (e.g. "拍摄于 iPhone 15 Pro")
      if (entry.summary && entry.summary.includes('拍摄于')) {
        const modelStr = entry.summary.replace('拍摄于', '').trim();
        exif = { ...exif, model: modelStr };
      }

      items.push({
        id: entry.id,
        title: entry.title,
        url: url || `https://picsum.photos/seed/${entry.id}/1600/1200`,
        thumbUrl: thumbUrl || `https://picsum.photos/seed/${entry.id}/600/600`,
        occurredAt: entry.occurredAt,
        visibility: entry.visibility,
        summary: entry.summary,
        tags: entry.tags,
        exif,
      });
    }

    photos.value = items;
  } catch (err) {
    console.error('Failed to load gallery photos:', err);
  } finally {
    isLoading.value = false;
  }
}

function handleUploadSuccess(_assets: MediaAssetDto[]) {
  loadGalleryPhotos();
}

function handleEntryCreated(_entry: EntryDto) {
  loadGalleryPhotos();
}

onMounted(() => {
  loadGalleryPhotos();
});
</script>
