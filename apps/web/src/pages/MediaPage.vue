<template>
  <div class="gallery-reveal space-y-10 sm:space-y-12">
    <!-- ========================================================= -->
    <!-- MONUMENTAL EXHIBITION MASTHEAD                            -->
    <!-- ========================================================= -->
    <section class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-end pb-8 border-b border-[#DDD6C9]">
      <div class="lg:col-span-7 space-y-3">
        <div class="flex items-center gap-3 kicker-caps text-[#9A3F2B]">
          <span>CHAPTER II</span>
          <span class="w-6 h-[1px] bg-[#C4BBA9]"></span>
          <span class="text-[#787268]">EXHIBITION GALLERY · EXIF OPTICAL PLATES</span>
        </div>
        <div class="flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <h1 class="font-serif text-4xl sm:text-5xl lg:text-[54px] font-light tracking-[0.04em] text-[#161513] leading-[1.12]">
            影像长廊
          </h1>
          <span class="font-display italic text-2xl sm:text-3xl font-light text-[#9B9488] tracking-wide">
            Planche photographique
          </span>
        </div>
      </div>

      <div class="lg:col-span-5 flex flex-col lg:items-end justify-between gap-4">
        <p class="font-serif text-[13.5px] sm:text-sm text-[#57534C] leading-[1.85] lg:text-right max-w-md font-light">
          定格于光影交织的瞬间，以自然画幅与无酸卡纸裱框呈列，保留真实光学参数与快门刻度。
        </p>

        <div class="flex flex-wrap items-center gap-4">
          <span class="font-mono text-[11px] tracking-[0.14em] text-[#787268] tabular-nums">
            {{ filteredPhotos.length }} 幅印相
          </span>
          <button
            v-if="authStore.isAdmin"
            type="button"
            class="inline-flex items-center gap-2 rounded-[2px] bg-[#161513] px-4 py-2 text-xs font-serif tracking-[0.14em] text-[#FAF8F4] hover:bg-[#9A3F2B] transition-colors duration-200"
            @click="isUploaderOpen = true"
          >
            <UploadCloudIcon class="w-3.5 h-3.5" />
            <span>直传印相</span>
          </button>
        </div>
      </div>
    </section>

    <!-- ========================================================= -->
    <!-- GALLERY CONTROL RAIL                                      -->
    <!-- ========================================================= -->
    <section class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#DDD6C9]">
      <div class="flex flex-wrap items-center gap-6">
        <template v-if="authStore.isAdmin">
          <button
            v-for="tab in visibilityTabs"
            :key="tab.value"
            type="button"
            class="relative pb-3.5 text-[13px] font-serif tracking-[0.12em] transition-colors"
            :class="
              visibilityFilter === tab.value
                ? 'text-[#161513] font-medium'
                : 'text-[#57534C] hover:text-[#161513]'
            "
            @click="changeVisibilityFilter(tab.value)"
          >
            <span>{{ tab.label }}</span>
            <span
              class="absolute -bottom-[1px] inset-x-0 h-[1.5px] bg-[#9A3F2B] transition-transform duration-300 ease-gallery origin-left"
              :class="visibilityFilter === tab.value ? 'scale-x-100' : 'scale-x-0'"
            ></span>
          </button>
        </template>
        <span v-else class="kicker-caps text-[#6E685E] pb-3.5">
          CURATED PRINT WALL · CLICK ANY PLATE TO ENTER VIEWING ROOM
        </span>
      </div>

      <div class="flex flex-wrap items-center gap-5 pb-3">
        <div class="relative flex items-center">
          <SearchIcon class="w-3.5 h-3.5 text-[#6E685E] pointer-events-none mr-2" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="检索片名或相机机型..."
            class="w-44 sm:w-52 bg-transparent border-b border-[#C4BBA9] focus:border-[#161513] pb-1 text-xs text-[#161513] placeholder-[#787268] focus:outline-none transition-colors"
          />
        </div>

        <div class="inline-flex items-center border border-[#DDD6C9] rounded-[2px] bg-[#FAF8F4] text-[11px] font-serif tracking-[0.12em]">
          <button
            type="button"
            class="px-3 py-1 transition-colors"
            :class="wallMode === 'masonry' ? 'bg-[#161513] text-[#FAF8F4]' : 'text-[#57534C] hover:text-[#161513]'"
            @click="wallMode = 'masonry'"
          >
            画幅墙
          </button>
          <button
            type="button"
            class="px-3 py-1 border-l border-[#DDD6C9] transition-colors"
            :class="wallMode === 'grid' ? 'bg-[#161513] text-[#FAF8F4]' : 'text-[#57534C] hover:text-[#161513]'"
            @click="wallMode = 'grid'"
          >
            接触表
          </button>
        </div>
      </div>
    </section>

    <!-- ========================================================= -->
    <!-- LOADING SKELETONS                                         -->
    <!-- ========================================================= -->
    <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      <div
        v-for="i in 6"
        :key="i"
        class="passe-partout p-4 animate-pulse space-y-4"
      >
        <div class="w-full bg-[#EAE4D8]" :class="i % 2 === 0 ? 'aspect-[4/5]' : 'aspect-[4/3]'"></div>
        <div class="flex justify-between">
          <div class="h-3 bg-[#EAE4D8] w-1/3"></div>
          <div class="h-3 bg-[#EAE4D8] w-1/5"></div>
        </div>
      </div>
    </div>

    <!-- ========================================================= -->
    <!-- SERENE MUSEUM EMPTY STATE                                 -->
    <!-- ========================================================= -->
    <div
      v-else-if="filteredPhotos.length === 0"
      class="py-24 sm:py-32 px-6 text-center flex flex-col items-center justify-center border-y border-[#DDD6C9] bg-[#FAF8F4]/40"
    >
      <div class="w-[1px] h-10 bg-[#C4BBA9] mb-6"></div>
      <div class="relative w-12 h-9 flex items-center justify-center mb-6 border border-[#C4BBA9]">
        <span class="w-6 h-4 border border-[#DDD6C9]"></span>
      </div>
      <p class="font-display italic text-lg text-[#9B9488] tracking-wide">
        {{ searchQuery ? 'No Plates Matched' : 'Gallery Wall Unhung' }}
      </p>
      <h3 class="mt-2 font-serif text-2xl font-light tracking-[0.08em] text-[#161513]">
        {{ searchQuery ? '未检索到匹配的影像印相' : '展墙尚待悬画' }}
      </h3>
      <p class="mt-3 text-xs text-[#787268] max-w-sm leading-[1.9] font-light">
        {{ searchQuery ? '可尝试更换相机机型或标题关键词。' : '影像长廊目前虚位以待，管理员可直传高保真 WebP 摄影作品并自动保留 EXIF 光学信息。' }}
      </p>
      <button
        v-if="authStore.isAdmin && !searchQuery"
        type="button"
        class="mt-8 inline-flex items-center gap-2 rounded-[2px] bg-[#161513] px-5 py-2.5 text-xs font-serif tracking-[0.16em] text-[#FAF8F4] hover:bg-[#9A3F2B] transition-colors"
        @click="isUploaderOpen = true"
      >
        <UploadCloudIcon class="w-3.5 h-3.5" />
        <span>悬置首幅影像</span>
      </button>
    </div>

    <!-- ========================================================= -->
    <!-- MUSEUM EXHIBITION WALL (True Aspect Ratio Masonry / Grid) -->
    <!-- ========================================================= -->
    <div v-else class="space-y-10">
      <div
        :class="
          wallMode === 'masonry'
            ? 'columns-1 sm:columns-2 lg:columns-3 gap-7 lg:gap-9 space-y-7 lg:space-y-9'
            : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-7'
        "
      >
        <figure
          v-for="(photo, index) in filteredPhotos"
          :key="photo.id"
          class="group break-inside-avoid passe-partout rounded-[2px] p-3.5 sm:p-4 cursor-pointer transition-all duration-500 ease-gallery hover:border-[#C4BBA9] hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-28px_rgba(22,21,19,0.24)]"
          @click="openLightbox(index)"
        >
          <!-- Framed Photograph -->
          <div
            class="relative overflow-hidden bg-[#EAE4D8]"
            :class="wallMode === 'grid' ? 'aspect-[4/3]' : ''"
          >
            <img
              :src="photo.thumbUrl || photo.url"
              :alt="photo.title || '画廊照片'"
              loading="lazy"
              class="w-full block transition-transform duration-700 ease-gallery group-hover:scale-[1.03]"
              :class="wallMode === 'grid' ? 'h-full object-cover' : 'h-auto object-cover'"
            />

            <!-- Darkroom Hover Scrim & EXIF Optical Line -->
            <div
              class="absolute inset-0 bg-gradient-to-t from-[#11100F]/88 via-[#11100F]/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3"
            >
              <!-- Top Actions -->
              <div class="flex items-center justify-between gap-2">
                <span
                  v-if="photo.visibility === 'private'"
                  class="bg-[#11100F]/80 text-[#E5C58E] px-2 py-0.5 text-[9px] font-mono tracking-[0.18em] uppercase border border-[#E5C58E]/30"
                >
                  PRIVATE
                </span>
                <button
                  v-if="authStore.isAdmin"
                  type="button"
                  class="ml-auto p-1.5 bg-[#11100F]/75 text-[#FAF8F4]/80 hover:bg-[#9A3F2B] hover:text-white transition-colors"
                  @click.stop="handleDeleteMedia(photo.id)"
                  title="删除照片"
                >
                  <Trash2Icon class="w-3.5 h-3.5" />
                </button>
              </div>

              <!-- Bottom Optical Spec Readout -->
              <div class="flex items-center justify-between gap-2 text-[10px] font-mono tracking-[0.12em] text-[#FAF8F4]/90">
                <span class="truncate">
                  {{ photo.exif?.model || 'OPTICAL PRINT' }}
                </span>
                <span class="shrink-0 text-[#E2A998] tabular-nums">
                  <template v-if="photo.exif?.focalLength">{{ photo.exif.focalLength }}mm</template>
                  <template v-if="photo.exif?.fNumber"> · f/{{ photo.exif.fNumber }}</template>
                  <template v-if="photo.exif?.iso"> · ISO {{ photo.exif.iso }}</template>
                </span>
              </div>
            </div>
          </div>

          <!-- Museum Wall Placard Below Print -->
          <figcaption class="pt-3.5 px-0.5 flex items-baseline justify-between gap-3">
            <div class="min-w-0 flex items-baseline gap-2.5">
              <span class="font-display italic text-sm text-[#9B9488] shrink-0 tabular-nums">
                Pl. {{ String(index + 1).padStart(2, '0') }}
              </span>
              <span class="font-serif text-[13px] text-[#161513] group-hover:text-[#9A3F2B] transition-colors truncate">
                {{ photo.title || '无题印相' }}
              </span>
            </div>
            <span class="font-mono text-[10px] tracking-[0.1em] text-[#9B9488] shrink-0 tabular-nums">
              {{ formatOccurredAt(photo.occurredAt) }}
            </span>
          </figcaption>
        </figure>
      </div>

      <!-- Pagination -->
      <div v-if="hasMore" class="pt-6 text-center">
        <button
          type="button"
          :disabled="isLoadingMore"
          class="inline-flex items-center gap-3 px-8 py-3 rounded-[2px] border border-[#161513] text-xs font-serif tracking-[0.18em] text-[#161513] hover:bg-[#161513] hover:text-[#FAF8F4] transition-colors duration-200 disabled:opacity-40"
          @click="loadGalleryPhotos(false)"
        >
          <Loader2Icon v-if="isLoadingMore" class="w-3.5 h-3.5 animate-spin" />
          <span>{{ isLoadingMore ? '正在显影更多印相...' : '展开更多馆藏影像' }}</span>
        </button>
      </div>
    </div>

    <!-- Fullscreen Darkroom Viewing Room -->
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
  { label: '全部印相', value: 'all' },
  { label: '公开策展', value: 'public' },
  { label: '私密典藏', value: 'private' },
] as const;

const wallMode = ref<'masonry' | 'grid'>('masonry');
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
