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
        <h1 class="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-[#1D1C1A]">
          影像长廊
        </h1>
        <p class="mt-1 text-sm text-[#747169] font-serif italic">
          “定格于光影交织的瞬间，每一帧胶片皆附带真实光学参数与发生刻度。”
        </p>
      </div>

      <!-- Action Area -->
      <div class="flex flex-wrap items-center gap-3">
        <!-- Visibility Filter for Admin -->
        <div
          v-if="authStore.isAdmin"
          class="inline-flex rounded-xl bg-[#EFECE4] p-1 border border-[#E5E1D8] text-xs"
        >
          <button
            v-for="tab in visibilityTabs"
            :key="tab.value"
            type="button"
            class="px-2.5 py-1 rounded-lg transition-all"
            :class="
              visibilityFilter === tab.value
                ? 'bg-white text-[#1D1C1A] font-semibold shadow-xs'
                : 'text-[#747169] hover:text-[#1D1C1A]'
            "
            @click="changeVisibilityFilter(tab.value)"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Search Filter -->
        <div class="relative">
          <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9E9B93]" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="检索片名或相机机型..."
            class="w-48 sm:w-56 rounded-xl bg-white border border-[#E5E1D8] pl-9 pr-3 py-2 text-xs text-[#1D1C1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#C25438]/50 focus:ring-1 focus:ring-[#C25438]/30 transition-all shadow-xs"
          />
        </div>

        <!-- Admin Upload Button -->
        <button
          v-if="authStore.isAdmin"
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-[#C25438] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A9442C] shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
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
        class="aspect-square rounded-2xl bg-white border border-[#E5E1D8] p-2.5 animate-pulse flex items-center justify-center"
      >
        <div class="w-full h-full bg-[#EFECE4] rounded-xl flex items-center justify-center">
          <ImageIcon class="w-7 h-7 text-[#D4CEBF]" />
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredPhotos.length === 0"
      class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#D4CEBF] bg-white/60 p-16 text-center"
    >
      <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F7F5F0] border border-[#E5E1D8] mb-4 text-[#C25438]">
        <ImageIcon class="w-7 h-7" />
      </div>
      <h3 class="font-serif text-lg font-medium text-[#1D1C1A]">暂无影像作品</h3>
      <p class="mt-1 text-xs text-[#747169] max-w-sm">
        {{ searchQuery ? '未检索到匹配的摄影记录，请尝试其他关键词。' : '影像长廊目前为空，管理员可通过上方按钮直传 WebP 照片。' }}
      </p>
      <button
        v-if="authStore.isAdmin && !searchQuery"
        type="button"
        class="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#C25438] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A9442C] transition-colors"
        @click="isUploaderOpen = true"
      >
        <UploadCloudIcon class="w-3.5 h-3.5" />
        <span>立即直传第一张照片</span>
      </button>
    </div>

    <!-- Responsive Exhibition Mat Grid -->
    <div v-else class="space-y-6">
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
        <div
          v-for="(photo, index) in filteredPhotos"
          :key="photo.id"
          class="group relative bg-white p-2 sm:p-2.5 rounded-2xl border border-[#E5E1D8] shadow-xs transition-all duration-300 hover:border-[#D4CEBF] hover:shadow-md hover:-translate-y-1 cursor-pointer flex flex-col"
          @click="openLightbox(index)"
        >
          <!-- Picture Frame -->
          <div class="aspect-square overflow-hidden rounded-xl bg-[#EFECE4] relative">
            <img
              :src="photo.thumbUrl || photo.url"
              :alt="photo.title || '画廊照片'"
              loading="lazy"
              class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />

            <!-- Optical HUD Overlay on Hover -->
            <div
              class="absolute inset-0 bg-gradient-to-t from-[#1D1C1A]/90 via-[#1D1C1A]/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2.5"
            >
              <!-- Top Badges & Admin Delete -->
              <div class="flex items-center justify-between gap-1">
                <span
                  v-if="photo.visibility === 'private'"
                  class="rounded-md bg-amber-900/75 text-amber-200 px-1.5 py-0.5 text-[10px] font-mono border border-amber-400/30"
                >
                  私密
                </span>
                <span
                  v-if="photo.exif?.model"
                  class="ml-auto rounded-md bg-black/65 text-white/90 px-1.5 py-0.5 text-[10px] font-mono truncate max-w-[110px] backdrop-blur-xs border border-white/10"
                >
                  {{ photo.exif.model }}
                </span>
                <button
                  v-if="authStore.isAdmin"
                  type="button"
                  class="ml-1 rounded-md bg-black/65 p-1 text-white/80 hover:bg-[#C25438] hover:text-white transition-colors"
                  @click.stop="handleDeleteMedia(photo.id)"
                  title="删除照片"
                >
                  <Trash2Icon class="w-3 h-3" />
                </button>
              </div>

              <!-- Bottom Optical Bar -->
              <div>
                <h4 class="text-xs font-medium text-white truncate">{{ photo.title || '影像切片' }}</h4>
                <div class="mt-0.5 flex items-center justify-between text-[10px] text-white/75 font-mono">
                  <span>{{ formatOccurredAt(photo.occurredAt) }}</span>
                  <span v-if="photo.exif?.fNumber" class="text-[#E58D76]">
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

      <!-- Pagination -->
      <div v-if="hasMore" class="pt-2 text-center">
        <button
          type="button"
          :disabled="isLoadingMore"
          class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white hover:bg-[#F7F5F0] border border-[#E5E1D8] text-xs font-medium text-[#1D1C1A] shadow-xs transition-all disabled:opacity-50"
          @click="loadGalleryPhotos(false)"
        >
          <Loader2Icon v-if="isLoadingMore" class="w-3.5 h-3.5 animate-spin text-[#C25438]" />
          <span>{{ isLoadingMore ? '加载更多胶片...' : '加载更多影像' }}</span>
        </button>
      </div>
    </div>

    <!-- Fullscreen Lightbox Preview -->
    <MediaLightbox
      v-model="isLightboxOpen"
      :items="lightboxItems"
      :initial-index="lightboxIndex"
      :can-delete="authStore.isAdmin"
      @delete="handleDeleteMedia"
    />

    <!-- Multi-file Upload Drawer/Modal -->
    <MediaUploader
      v-model="isUploaderOpen"
      @uploaded="handleUploadSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import {
  Image as ImageIcon,
  UploadCloud as UploadCloudIcon,
  Search as SearchIcon,
  Trash2 as Trash2Icon,
  Loader2 as Loader2Icon,
} from 'lucide-vue-next';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { useUiStore } from '@/shared/stores/ui.store';
import { apiClient } from '@/shared/api/client';
import MediaLightbox, { type LightboxItem } from '@/features/media/components/MediaLightbox.vue';
import MediaUploader from '@/features/media/components/MediaUploader.vue';
import type { MediaAssetDto } from '@archive/contracts';
import { formatDate } from '@archive/shared';

const authStore = useAuthStore();
const uiStore = useUiStore();

const visibilityTabs = [
  { label: '全部', value: 'all' },
  { label: '公开', value: 'public' },
  { label: '私密', value: 'private' },
] as const;

const isLoading = ref(true);
const isLoadingMore = ref(false);
const photos = ref<LightboxItem[]>([]);
const nextCursor = ref<string | null>(null);
const hasMore = ref(false);
const searchQuery = ref('');
const visibilityFilter = ref<'all' | 'public' | 'private'>('all');

const isLightboxOpen = ref(false);
const lightboxIndex = ref(0);
const isUploaderOpen = ref(false);

const filteredPhotos = computed(() => {
  if (!searchQuery.value.trim()) return photos.value;
  const q = searchQuery.value.trim().toLowerCase();
  return photos.value.filter((p) => {
    const matchTitle = (p.title || '').toLowerCase().includes(q);
    const matchModel = (p.exif?.model || '').toLowerCase().includes(q);
    const matchMake = (p.exif?.make || '').toLowerCase().includes(q);
    return matchTitle || matchModel || matchMake;
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

function mapAssetToLightboxItem(asset: MediaAssetDto): LightboxItem {
  const title = asset.originalFilename
    ? asset.originalFilename.replace(/\.[^/.]+$/, '')
    : '影像切片';
  return {
    id: asset.id,
    title,
    url: asset.originalUrl || asset.thumbUrl || '',
    thumbUrl: asset.thumbUrl || asset.originalUrl || '',
    width: asset.width,
    height: asset.height,
    sizeBytes: asset.sizeBytes,
    mimeType: asset.mimeType,
    occurredAt: asset.createdAt,
    visibility: asset.visibility,
    exif: asset.exif ?? undefined,
  };
}

function changeVisibilityFilter(val: 'all' | 'public' | 'private') {
  visibilityFilter.value = val;
  loadGalleryPhotos(true);
}

async function loadGalleryPhotos(reset: boolean = true) {
  if (reset) {
    isLoading.value = true;
    nextCursor.value = null;
  } else {
    isLoadingMore.value = true;
  }

  try {
    const params: Record<string, string | number> = {
      mediaType: 'image',
      limit: 40,
    };
    if (authStore.isAdmin && visibilityFilter.value !== 'all') {
      params.visibility = visibilityFilter.value;
    }
    if (!reset && nextCursor.value) {
      params.cursor = nextCursor.value;
    }

    const res = await apiClient.getPaginated<MediaAssetDto>('/api/v1/media', { params });
    const mapped = res.items.map(mapAssetToLightboxItem);

    if (reset) {
      photos.value = mapped;
    } else {
      photos.value = [...photos.value, ...mapped];
    }

    nextCursor.value = res.pagination.cursor;
    hasMore.value = res.pagination.hasMore;
  } catch (err: any) {
    uiStore.notifyError(err?.message || '加载影像长廊失败');
  } finally {
    isLoading.value = false;
    isLoadingMore.value = false;
  }
}

async function handleDeleteMedia(id: string) {
  const ok = await uiStore.confirm({
    title: '删除影像资产',
    message: '确定要删除这张照片吗？删除后将不再在长廊中展示。',
    confirmLabel: '确认删除',
    danger: true,
  });
  if (!ok) return;

  try {
    await apiClient.delete(`/api/v1/media/${id}`);
    photos.value = photos.value.filter((p) => p.id !== id);
    if (photos.value.length === 0) {
      isLightboxOpen.value = false;
    } else if (lightboxIndex.value >= photos.value.length) {
      lightboxIndex.value = photos.value.length - 1;
    }
    uiStore.notifySuccess('已移除该影像');
  } catch (err: any) {
    uiStore.notifyError(err?.message || '删除失败');
  }
}

function handleUploadSuccess() {
  loadGalleryPhotos(true);
}

watch(
  () => authStore.isAdmin,
  () => {
    loadGalleryPhotos(true);
  }
);

watch(
  () => uiStore.pendingAction,
  (action) => {
    if (action === 'photo') {
      uiStore.consumeQuickAction('photo');
      isUploaderOpen.value = true;
    }
  },
  { immediate: true }
);

onMounted(() => {
  loadGalleryPhotos(true);
});
</script>
