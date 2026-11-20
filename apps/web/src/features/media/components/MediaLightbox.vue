<template>
  <Teleport to="body">
    <div
      v-if="modelValue && currentItem"
      class="fixed inset-0 z-50 flex overflow-hidden bg-[#0E0D0C]/98 backdrop-blur-xl text-[#F3EFE7] select-none"
      tabindex="-1"
      @keydown="handleKeyDown"
      ref="containerRef"
    >
      <!-- Main Viewing Room Stage -->
      <div class="relative flex-1 flex flex-col h-full overflow-hidden">
        <!-- Top Architectural Toolbar -->
        <header
          class="absolute top-0 inset-x-0 z-20 flex h-16 items-center justify-between px-5 sm:px-8 border-b border-white/[0.08] bg-[#0E0D0C]/80 backdrop-blur-md"
        >
          <!-- Left: Plate Counter & Title -->
          <div class="flex items-center gap-4 min-w-0">
            <span class="font-display italic text-base text-[#C4BBA9] tabular-nums shrink-0">
              Pl. {{ String(currentIndex + 1).padStart(2, '0') }} / {{ String(items.length).padStart(2, '0') }}
            </span>
            <span class="hidden sm:inline-block h-3.5 w-[1px] bg-white/15"></span>
            <span class="hidden sm:inline-block font-serif text-sm font-light tracking-wide text-[#F3EFE7] truncate max-w-md">
              {{ currentItem.title || '影像原片' }}
            </span>
          </div>

          <!-- Right: Hairline Controls -->
          <div class="flex items-center gap-1.5">
            <div class="hidden sm:inline-flex items-center border border-white/15 rounded-[2px]">
              <button
                type="button"
                class="p-2 text-[#B8B0A3] hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-30"
                :disabled="zoomScale <= 0.6"
                @click="zoomOut"
                title="缩小 (-)"
              >
                <ZoomOutIcon class="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                class="px-2.5 py-1.5 border-x border-white/15 text-[11px] font-mono text-[#D4CCC0] hover:text-white tabular-nums transition-colors"
                @click="resetZoom"
                title="重置缩放 (0)"
              >
                {{ Math.round(zoomScale * 100) }}%
              </button>
              <button
                type="button"
                class="p-2 text-[#B8B0A3] hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-30"
                :disabled="zoomScale >= 3.5"
                @click="zoomIn"
                title="放大 (+)"
              >
                <ZoomInIcon class="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              class="px-3 py-1.5 rounded-[2px] border text-[10px] font-mono tracking-[0.18em] uppercase transition-colors"
              :class="
                showExifDrawer
                  ? 'bg-[#9A3F2B] text-white border-[#9A3F2B]'
                  : 'border-white/15 text-[#B8B0A3] hover:text-white hover:border-white/35'
              "
              @click="showExifDrawer = !showExifDrawer"
              title="切换 EXIF 光学参数"
            >
              EXIF
            </button>

            <button
              v-if="canDelete"
              type="button"
              class="p-2 rounded-[2px] border border-white/15 text-[#B8B0A3] hover:text-[#E2A998] hover:border-[#9A3F2B] transition-colors"
              @click="emit('delete', currentItem.id)"
              title="删除此照片"
            >
              <Trash2Icon class="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              class="p-2 rounded-[2px] border border-white/15 text-[#B8B0A3] hover:text-white hover:border-white/40 transition-colors ml-1"
              @click="handleClose"
              title="关闭 (ESC)"
            >
              <XIcon class="w-4 h-4" />
            </button>
          </div>
        </header>

        <!-- Image Stage -->
        <main
          class="relative flex-1 flex items-center justify-center px-6 sm:px-16 py-20 overflow-hidden cursor-grab active:cursor-grabbing"
          @click.self="handleStageClick"
          @dblclick="handleDoubleClick"
        >
          <button
            v-if="hasPrev"
            type="button"
            class="absolute left-5 z-20 flex h-11 w-11 items-center justify-center rounded-[2px] bg-[#161513]/80 hover:bg-[#23211E] text-[#C4BBA9] hover:text-white border border-white/15 transition-all"
            @click.stop="prevPhoto"
            title="上一张 (←)"
          >
            <ChevronLeftIcon class="w-5 h-5" />
          </button>

          <div
            class="relative transition-transform duration-200 ease-out flex items-center justify-center"
            :style="{ transform: `scale(${zoomScale})` }"
          >
            <img
              v-show="!imageError"
              ref="imgRef"
              :key="currentItem.url || currentItem.thumbUrl"
              :src="currentItem.url || currentItem.thumbUrl"
              :alt="currentItem.title || '照片大图预览'"
              class="max-h-[78vh] max-w-[84vw] object-contain shadow-[0_32px_80px_-20px_rgba(0,0,0,0.85)] ring-1 ring-white/10 transition-opacity duration-300"
              :class="{ 'opacity-0': !imageLoaded, 'opacity-100': imageLoaded }"
              @load="onImageLoad"
              @error="onImageError"
            />
            <div
              v-if="!imageLoaded && !imageError"
              class="absolute inset-0 flex items-center justify-center min-h-[260px] min-w-[260px]"
            >
              <Loader2Icon class="w-6 h-6 text-[#9A3F2B] animate-spin" />
            </div>
            <div
              v-if="imageError"
              class="flex flex-col items-center justify-center gap-3 border border-white/15 bg-[#161513] px-12 py-14 text-center"
            >
              <ImageOffIcon class="w-7 h-7 text-[#8E887E]" />
              <p class="text-xs text-[#C4BBA9] font-mono tracking-wider">影像资源暂无法加载</p>
            </div>
          </div>

          <button
            v-if="hasNext"
            type="button"
            class="absolute right-5 z-20 flex h-11 w-11 items-center justify-center rounded-[2px] bg-[#161513]/80 hover:bg-[#23211E] text-[#C4BBA9] hover:text-white border border-white/15 transition-all"
            @click.stop="nextPhoto"
            title="下一张 (→)"
          >
            <ChevronRightIcon class="w-5 h-5" />
          </button>
        </main>

        <!-- Bottom Optical Colophon Bar -->
        <footer
          class="absolute bottom-0 inset-x-0 z-20 h-14 px-6 border-t border-white/[0.08] bg-[#0E0D0C]/85 backdrop-blur-md flex items-center justify-center"
        >
          <div class="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[11px] font-mono tracking-[0.12em] text-[#B8B0A3] tabular-nums">
            <span v-if="currentItem.exif?.model" class="text-[#FAF8F4] font-medium">
              {{ currentItem.exif.model }}
            </span>
            <span v-if="currentItem.exif?.focalLength">{{ currentItem.exif.focalLength }}MM</span>
            <span v-if="currentItem.exif?.fNumber" class="text-[#E2A998]">f/{{ currentItem.exif.fNumber }}</span>
            <span v-if="currentItem.exif?.exposureTime">{{ currentItem.exif.exposureTime }}</span>
            <span v-if="currentItem.exif?.iso">ISO {{ currentItem.exif.iso }}</span>
            <span v-if="currentItem.summary" class="text-[#8E887E] font-serif tracking-normal truncate max-w-sm">
              {{ currentItem.summary }}
            </span>
            <span v-else-if="!currentItem.exif?.model" class="text-[#8E887E]">
              {{ formatOccurredAt(currentItem.occurredAt) }}
            </span>
          </div>
        </footer>
      </div>

      <!-- Right Darkroom Contact-Sheet EXIF Drawer -->
      <aside
        v-if="showExifDrawer"
        class="w-80 md:w-[340px] flex-shrink-0 border-l border-white/10 bg-[#141311] flex flex-col h-full z-30"
      >
        <div class="flex items-center justify-between border-b border-white/10 px-6 h-16">
          <span class="kicker-caps text-[#E2A998]">OPTICAL COLOPHON</span>
          <button
            type="button"
            class="p-1.5 text-[#8E887E] hover:text-white transition-colors"
            @click="showExifDrawer = false"
          >
            <XIcon class="w-4 h-4" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-6 space-y-6 text-xs text-[#C4BBA9]">
          <div class="space-y-1.5">
            <h4 class="font-serif text-lg font-light text-[#FAF8F4] leading-snug">
              {{ currentItem.title || '无标题影像' }}
            </h4>
            <p class="font-mono text-[11px] text-[#8E887E] tabular-nums">
              {{ formatOccurredAt(currentItem.occurredAt) }}
            </p>
          </div>

          <div class="border-y border-white/10 py-4 space-y-1.5">
            <span class="kicker-caps text-[#8E887E] block">CAMERA APPARATUS</span>
            <div class="text-sm font-serif text-[#FAF8F4]">
              {{ currentItem.exif?.make ? `${currentItem.exif.make} ` : '' }}{{ currentItem.exif?.model || '未记录相机型号' }}
            </div>
            <div v-if="currentItem.exif?.dateTimeOriginal" class="text-[11px] font-mono text-[#8E887E] tabular-nums">
              SHUTTER · {{ currentItem.exif.dateTimeOriginal }}
            </div>
          </div>

          <div class="space-y-3">
            <span class="kicker-caps text-[#8E887E] block">EXPOSURE MATRIX</span>
            <div class="grid grid-cols-2 border border-white/10 divide-x divide-y divide-white/10">
              <div class="p-3.5">
                <span class="text-[10px] font-mono tracking-widest text-[#8E887E] block uppercase">Aperture</span>
                <span class="font-display italic text-xl text-[#E2A998] tabular-nums mt-1 block">
                  {{ currentItem.exif?.fNumber ? `f/${currentItem.exif.fNumber}` : '—' }}
                </span>
              </div>
              <div class="p-3.5">
                <span class="text-[10px] font-mono tracking-widest text-[#8E887E] block uppercase">Shutter</span>
                <span class="font-display italic text-xl text-[#FAF8F4] tabular-nums mt-1 block">
                  {{ currentItem.exif?.exposureTime || '—' }}
                </span>
              </div>
              <div class="p-3.5">
                <span class="text-[10px] font-mono tracking-widest text-[#8E887E] block uppercase">ISO</span>
                <span class="font-display italic text-xl text-[#FAF8F4] tabular-nums mt-1 block">
                  {{ currentItem.exif?.iso || '—' }}
                </span>
              </div>
              <div class="p-3.5">
                <span class="text-[10px] font-mono tracking-widest text-[#8E887E] block uppercase">Focal</span>
                <span class="font-display italic text-xl text-[#FAF8F4] tabular-nums mt-1 block">
                  {{ currentItem.exif?.focalLength ? `${currentItem.exif.focalLength}mm` : '—' }}
                </span>
              </div>
            </div>
          </div>

          <div class="space-y-2.5 border-t border-white/10 pt-5 font-mono text-[11px]">
            <div class="flex items-center justify-between">
              <span class="text-[#8E887E]">DIMENSIONS</span>
              <span class="text-[#FAF8F4] tabular-nums">
                {{ currentItem.width && currentItem.height ? `${currentItem.width} × ${currentItem.height}` : 'AUTO' }}
              </span>
            </div>
            <div v-if="currentItem.sizeBytes" class="flex items-center justify-between">
              <span class="text-[#8E887E]">FILE SIZE</span>
              <span class="text-[#FAF8F4] tabular-nums">
                {{ formatSize(currentItem.sizeBytes) }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-[#8E887E]">ACCESS</span>
              <span :class="currentItem.visibility === 'private' ? 'text-[#E5C58E]' : 'text-[#A3BCA9]'">
                {{ currentItem.visibility === 'private' ? 'PRIVATE ARCHIVE' : 'PUBLIC EXHIBIT' }}
              </span>
            </div>
          </div>

          <div v-if="currentItem.tags && currentItem.tags.length > 0" class="border-t border-white/10 pt-5">
            <span class="kicker-caps text-[#8E887E] block mb-2.5">INDEX TAGS</span>
            <div class="flex flex-wrap gap-2.5">
              <span
                v-for="tag in currentItem.tags"
                :key="tag"
                class="text-[11px] font-mono text-[#C4BBA9]"
              >
                #{{ tag }}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import {
  X as XIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Loader2 as Loader2Icon,
  ImageOff as ImageOffIcon,
  Trash2 as Trash2Icon,
} from 'lucide-vue-next';
import { formatFileSize, type ExifMetadata } from '@/shared/utils/image-processor';
import { formatDateTime } from '@archive/shared';

export interface LightboxItem {
  id: string;
  title?: string;
  url: string;
  thumbUrl?: string;
  width?: number | null;
  height?: number | null;
  sizeBytes?: number | null;
  mimeType?: string;
  occurredAt?: number;
  visibility?: string;
  summary?: string | null;
  tags?: string[];
  exif?: ExifMetadata;
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    items: LightboxItem[];
    initialIndex?: number;
    canDelete?: boolean;
  }>(),
  {
    initialIndex: 0,
    canDelete: false,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'change', index: number): void;
  (e: 'delete', id: string): void;
}>();

const containerRef = ref<HTMLElement | null>(null);
const imgRef = ref<HTMLImageElement | null>(null);
const currentIndex = ref(props.initialIndex);
const zoomScale = ref(1.0);
const showExifDrawer = ref(false);
const imageLoaded = ref(false);
const imageError = ref(false);

const currentItem = computed<LightboxItem | null>(() => {
  if (props.items.length === 0) return null;
  const clamped = Math.max(0, Math.min(currentIndex.value, props.items.length - 1));
  return props.items[clamped] ?? null;
});

const hasPrev = computed(() => currentIndex.value > 0);
const hasNext = computed(() => currentIndex.value < props.items.length - 1);

function syncInitialIndex() {
  if (props.items.length === 0) {
    currentIndex.value = 0;
    return;
  }
  currentIndex.value = Math.max(0, Math.min(props.initialIndex, props.items.length - 1));
}

watch(
  () => props.initialIndex,
  () => {
    syncInitialIndex();
    imageLoaded.value = false;
    imageError.value = false;
    resetZoom();
  }
);

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      syncInitialIndex();
      resetZoom();
      imageLoaded.value = false;
      imageError.value = false;
      nextTick(() => {
        containerRef.value?.focus();
        if (imgRef.value?.complete && imgRef.value.naturalWidth > 0) {
          imageLoaded.value = true;
        }
      });
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }
);

function onImageLoad() {
  imageLoaded.value = true;
  imageError.value = false;
}

function onImageError() {
  imageLoaded.value = true;
  imageError.value = true;
}

function prevPhoto() {
  if (hasPrev.value) {
    currentIndex.value--;
    onIndexChanged();
  }
}

function nextPhoto() {
  if (hasNext.value) {
    currentIndex.value++;
    onIndexChanged();
  }
}

function onIndexChanged() {
  imageLoaded.value = false;
  imageError.value = false;
  resetZoom();
  nextTick(() => {
    if (imgRef.value?.complete && imgRef.value.naturalWidth > 0) {
      imageLoaded.value = true;
    }
  });
  emit('change', currentIndex.value);
}

function zoomIn() {
  zoomScale.value = Math.min(3.5, Number((zoomScale.value + 0.25).toFixed(2)));
}

function zoomOut() {
  zoomScale.value = Math.max(0.6, Number((zoomScale.value - 0.25).toFixed(2)));
}

function resetZoom() {
  zoomScale.value = 1.0;
}

function handleDoubleClick() {
  if (zoomScale.value > 1.0) {
    resetZoom();
  } else {
    zoomScale.value = 2.0;
  }
}

function handleStageClick() {
  if (zoomScale.value > 1.0) {
    resetZoom();
  }
}

function handleClose() {
  emit('update:modelValue', false);
}

function handleKeyDown(e: KeyboardEvent) {
  if (!props.modelValue) return;

  switch (e.key) {
    case 'Escape':
      handleClose();
      break;
    case 'ArrowLeft':
      prevPhoto();
      break;
    case 'ArrowRight':
      nextPhoto();
      break;
    case '+':
    case '=':
      zoomIn();
      break;
    case '-':
      zoomOut();
      break;
    case '0':
      resetZoom();
      break;
  }
}

function formatOccurredAt(ts?: number): string {
  if (!ts) return '未知时间';
  return formatDateTime(ts, false);
}

function formatSize(bytes: number): string {
  return formatFileSize(bytes);
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  document.body.style.overflow = '';
});
</script>
