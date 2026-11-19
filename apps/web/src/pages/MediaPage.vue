<template>
  <div class="space-y-8">
    <!-- Page Header & Action Bar -->
    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-[#E5E1D8] pb-6">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="text-[11px] font-mono tracking-widest text-[#C25438] uppercase font-semibold">EXHIBITION GALLERY</span>
          <span class="text-[#D4CEBF]">&middot;</span>
          <span class="text-[11px] font-mono text-[#9E9B93]">EXIF OPTICAL SPECS</span>
        </div>
        <h1 class="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-[#1D1C1A] flex items-center gap-3">
          <span>影像长廊</span>
        </h1>
        <p class="mt-1 text-sm text-[#747169] font-serif italic">
          “定格于光影交织的瞬间，每一帧胶片皆附带真实光学参数与发生刻度。”
        </p>
      </div>

      <!-- Action Area -->
      <div class="flex items-center gap-3">
        <!-- Search Filter -->
        <div class="relative">
          <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9E9B93]" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="检索照片、机型或标签..."
            class="w-48 sm:w-60 rounded-xl bg-white border border-[#E5E1D8] pl-9 pr-3 py-2 text-xs text-[#1D1C1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#C25438]/50 focus:ring-1 focus:ring-[#C25438]/30 transition-all shadow-sm"
          />
        </div>

        <!-- Admin Upload Button -->
        <button
          v-if="authStore.isAdmin"
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-[#C25438] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A9442C] shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          @click="isUploaderOpen = true"
        >
          <UploadCloudIcon class="w-3.5 h-3.5" />
          <span>直传照片 R2</span>
        </button>
      </div>
    </div>

    <!-- Loading Skeletons -->
    <div v-if="isLoading" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      <div
        v-for="i in 10"
        :key="i"
        class="aspect-square rounded-2xl bg-white border border-[#E5E1D8] p-2 animate-pulse flex items-center justify-center"
      >
        <div class="w-full h-full bg-[#EFECE4] rounded-xl flex items-center justify-center">
          <ImageIcon class="w-8 h-8 text-[#D4CEBF]" />
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredPhotos.length === 0"
      class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#D4CEBF] bg-white/60 p-16 text-center"
    >
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F7F5F0] border border-[#E5E1D8] mb-4 text-[#C25438]">
        <ImageIcon class="w-8 h-8" />
      </div>
      <h3 class="font-serif text-lg font-medium text-[#1D1C1A]">暂无媒体照片</h3>
      <p class="mt-1 text-xs text-[#747169] max-w-sm">
        {{ searchQuery ? '未检索到匹配的摄影记录，请尝试其他关键词。' : '媒体长廊目前为空，管理员可通过上方按钮直传照片。' }}
      </p>
      <button
        v-if="authStore.isAdmin && !searchQuery"
        type="button"
        class="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#C25438] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A9442C] transition-colors"
        @click="isUploaderOpen = true"
      >
        <UploadCloudIcon class="w-3.5 h-3.5" />
        <span>立即上传第一张照片</span>
      </button>
    </div>

    <!-- Responsive Exhibition Mat Grid -->
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
      <div
        v-for="(photo, index) in filteredPhotos"
        :key="photo.id"
        class="group relative bg-white p-2 sm:p-2.5 rounded-2xl border border-[#E5E1D8] shadow-sm transition-all duration-300 hover:border-[#D4CEBF] hover:shadow-md hover:-translate-y-1 cursor-pointer flex flex-col"
        @click="openLightbox(index)"
      >
        <!-- Picture Frame with Aspect Ratio -->
        <div class="aspect-square overflow-hidden rounded-xl bg-[#EFECE4] relative">
          <!-- Background Image Thumbnail -->
          <img
            :src="photo.thumbUrl || photo.url"
            :alt="photo.title || '画廊照片'"
            loading="lazy"
            class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          <!-- Optical HUD Overlay on Hover -->
          <div
            class="absolute inset-0 bg-gradient-to-t from-[#1D1C1A]/90 via-[#1D1C1A]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3"
          >
            <!-- Top Badges -->
            <div class="flex items-center justify-between gap-1">
              <span
                v-if="photo.visibility === 'private'"
                class="rounded-md bg-amber-500/30 text-amber-300 px-1.5 py-0.5 text-[10px] font-mono border border-amber-400/40"
              >
                私密
              </span>
              <span
                v-if="photo.exif?.model"
                class="ml-auto rounded-md bg-black/60 text-white/90 px-1.5 py-0.5 text-[10px] font-mono truncate max-w-[120px] backdrop-blur-xs border border-white/10"
              >
                {{ photo.exif.model }}
              </span>
            </div>

            <!-- Bottom Meta -->
            <div>
              <h4 class="text-xs font-medium text-white truncate">{{ photo.title || '照片' }}</h4>
              <div class="mt-0.5 flex items-center justify-between text-[10px] text-white/70 font-mono">
                <span>{{ formatOccurredAt(photo.occurredAt) }}</span>
                <span v-if="photo.exif?.fNumber" class="text-amber-300">
                  f/{{ photo.exif.fNumber }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Mat Board Caption Below -->
        <div class="pt-2 px-1 flex items-center justify-between text-[11px] text-[#747169]">
          <span class="truncate font-serif text-[#1D1C1A] text-xs">{{ photo.title || '无标题' }}</span>
          <span class="font-mono text-[10px] text-[#9E9B93] flex-shrink-0 ml-1">{{ formatOccurredAt(photo.occurredAt) }}</span>
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
