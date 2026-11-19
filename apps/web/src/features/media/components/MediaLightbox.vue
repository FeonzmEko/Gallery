<template>
  <Teleport to="body">
    <div
      v-if="modelValue && currentItem"
      class="fixed inset-0 z-50 flex overflow-hidden bg-[#161513]/96 backdrop-blur-xl text-[#F7F5F0] select-none"
      tabindex="-1"
      @keydown="handleKeyDown"
      ref="containerRef"
    >
      <!-- Main Content Area (Image + Controls) -->
      <div class="relative flex-1 flex flex-col h-full overflow-hidden">
        <!-- Top Toolbar -->
        <header
          class="absolute top-0 inset-x-0 z-20 flex h-16 items-center justify-between px-4 sm:px-6 bg-gradient-to-b from-[#161513]/90 via-[#161513]/45 to-transparent pointer-events-none"
        >
          <!-- Left: Title & Index Counter -->
          <div class="pointer-events-auto flex items-center gap-3 min-w-0">
            <span class="rounded-full bg-[#24221F]/90 px-3 py-1 text-xs font-mono text-[#D4CEBF] border border-[#3A3732] shadow">
              {{ currentIndex + 1 }} / {{ items.length }}
            </span>
            <span class="hidden sm:inline-block font-serif text-sm font-medium text-[#F7F5F0] truncate max-w-xs">
              {{ currentItem.title || '影像原片' }}
            </span>
          </div>

          <!-- Right: Zoom Controls & Toggles -->
          <div class="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              class="rounded-xl p-2 bg-[#24221F]/90 hover:bg-[#322F2B] text-[#D4CEBF] hover:text-white border border-[#3A3732] shadow transition-colors disabled:opacity-40"
              :disabled="zoomScale <= 0.6"
              @click="zoomOut"
              title="缩小 (-)"
            >
              <ZoomOutIcon class="w-4 h-4" />
            </button>

            <button
              type="button"
              class="px-2.5 py-1.5 rounded-xl bg-[#24221F]/90 hover:bg-[#322F2B] text-xs font-mono text-[#D4CEBF] hover:text-white border border-[#3A3732] shadow transition-colors"
              @click="resetZoom"
              title="重置缩放 (0)"
            >
              {{ Math.round(zoomScale * 100) }}%
            </button>

            <button
              type="button"
              class="rounded-xl p-2 bg-[#24221F]/90 hover:bg-[#322F2B] text-[#D4CEBF] hover:text-white border border-[#3A3732] shadow transition-colors disabled:opacity-40"
              :disabled="zoomScale >= 3.5"
              @click="zoomIn"
              title="放大 (+)"
            >
              <ZoomInIcon class="w-4 h-4" />
            </button>

            <button
              type="button"
              class="rounded-xl p-2 border shadow transition-colors"
              :class="[
                showExifDrawer
                  ? 'bg-[#C25438] text-white border-[#C25438]'
                  : 'bg-[#24221F]/90 hover:bg-[#322F2B] text-[#D4CEBF] hover:text-white border-[#3A3732]',
              ]"
              @click="showExifDrawer = !showExifDrawer"
              title="切换 EXIF 光学参数"
            >
              <InfoIcon class="w-4 h-4" />
            </button>

            <button
              v-if="canDelete"
              type="button"
              class="rounded-xl p-2 bg-[#24221F]/90 hover:bg-[#C25438]/25 hover:text-[#E58D76] text-[#D4CEBF] border border-[#3A3732] shadow transition-colors"
              @click="emit('delete', currentItem.id)"
              title="删除此照片"
            >
              <Trash2Icon class="w-4 h-4" />
            </button>

            <button
              type="button"
              class="rounded-xl p-2 bg-[#24221F]/90 hover:bg-[#C25438]/25 hover:text-[#E58D76] text-[#D4CEBF] border border-[#3A3732] shadow transition-colors ml-1"
              @click="handleClose"
              title="关闭 (ESC)"
            >
              <XIcon class="w-5 h-5" />
            </button>
          </div>
        </header>

        <!-- Image Stage -->
        <main
          class="relative flex-1 flex items-center justify-center p-4 overflow-hidden cursor-grab active:cursor-grabbing"
          @click.self="handleStageClick"
          @dblclick="handleDoubleClick"
        >
          <button
            v-if="hasPrev"
            type="button"
            class="absolute left-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-[#24221F]/80 hover:bg-[#322F2B] text-[#D4CEBF] hover:text-white border border-[#3A3732] shadow-xl transition-all hover:scale-105"
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
              class="max-h-[82vh] max-w-[85vw] object-contain rounded-lg shadow-2xl transition-opacity duration-200"
              :class="{ 'opacity-0': !imageLoaded, 'opacity-100': imageLoaded }"
              @load="onImageLoad"
              @error="onImageError"
            />
            <div
              v-if="!imageLoaded && !imageError"
              class="absolute inset-0 flex items-center justify-center min-h-[260px] min-w-[260px]"
            >
              <Loader2Icon class="w-7 h-7 text-[#C25438] animate-spin" />
            </div>
            <div
              v-if="imageError"
              class="flex flex-col items-center justify-center gap-2 rounded-2xl border border-[#3A3732] bg-[#24221F] px-10 py-12 text-center"
            >
              <ImageOffIcon class="w-8 h-8 text-[#9E9B93]" />
              <p class="text-xs text-[#D4CEBF] font-mono">影像资源暂无法加载</p>
            </div>
          </div>

          <button
            v-if="hasNext"
            type="button"
            class="absolute right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-[#24221F]/80 hover:bg-[#322F2B] text-[#D4CEBF] hover:text-white border border-[#3A3732] shadow-xl transition-all hover:scale-105"
            @click.stop="nextPhoto"
            title="下一张 (→)"
          >
            <ChevronRightIcon class="w-5 h-5" />
          </button>
        </main>

        <!-- Bottom Optical Strip / Caption -->
        <footer
          class="absolute bottom-0 inset-x-0 z-20 pointer-events-none p-4 flex justify-center bg-gradient-to-t from-[#161513]/90 to-transparent"
        >
          <div
            class="pointer-events-auto inline-flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-full bg-[#24221F]/90 px-4 py-2 text-[11px] font-mono text-[#D4CEBF] border border-[#3A3732] shadow backdrop-blur-md max-w-2xl"
          >
            <span v-if="currentItem.exif?.model" class="text-white font-medium">
              {{ currentItem.exif.model }}
            </span>
            <span v-if="currentItem.exif?.focalLength">{{ currentItem.exif.focalLength }}mm</span>
            <span v-if="currentItem.exif?.fNumber" class="text-[#E58D76]">f/{{ currentItem.exif.fNumber }}</span>
            <span v-if="currentItem.exif?.exposureTime">{{ currentItem.exif.exposureTime }}</span>
            <span v-if="currentItem.exif?.iso">ISO {{ currentItem.exif.iso }}</span>
            <span v-if="currentItem.summary" class="text-[#9E9B93] truncate max-w-xs">
              {{ currentItem.summary }}
            </span>
            <span v-else-if="!currentItem.exif?.model" class="text-[#9E9B93]">
              {{ formatOccurredAt(currentItem.occurredAt) }}
            </span>
          </div>
        </footer>
      </div>

      <!-- Right Collapsible EXIF Info Drawer -->
      <aside
        v-if="showExifDrawer"
        class="w-80 md:w-88 flex-shrink-0 border-l border-[#2E2C28] bg-[#1D1B18]/96 backdrop-blur-xl flex flex-col h-full shadow-2xl z-30"
      >
        <div class="flex items-center justify-between border-b border-[#2E2C28] px-5 py-4">
          <div class="flex items-center gap-2 text-[#E58D76] font-mono text-xs uppercase tracking-wider font-semibold">
            <CameraIcon class="w-4 h-4" />
            <span>EXIF 光学参数</span>
          </div>
          <button
            type="button"
            class="p-1 rounded-lg text-[#9E9B93] hover:text-white hover:bg-[#2E2C28] transition-colors"
            @click="showExifDrawer = false"
          >
            <XIcon class="w-4 h-4" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-5 py-5 space-y-5 text-xs text-[#D4CEBF]">
          <div>
            <h4 class="font-serif text-base font-medium text-[#F7F5F0] leading-snug">
              {{ currentItem.title || '无标题影像' }}
            </h4>
            <div class="mt-1.5 flex items-center gap-1.5 text-[#9E9B93] font-mono text-[11px]">
              <CalendarIcon class="w-3.5 h-3.5 text-[#C25438]" />
              <span>{{ formatOccurredAt(currentItem.occurredAt) }}</span>
            </div>
          </div>

          <div class="rounded-xl border border-[#2E2C28] bg-[#161513]/70 p-3.5">
            <div class="text-[11px] text-[#9E9B93] flex items-center gap-1.5 mb-1 font-mono">
              <CameraIcon class="w-3.5 h-3.5 text-[#84A58E]" />
              <span>相机机身</span>
            </div>
            <div class="text-sm font-medium text-[#F7F5F0]">
              {{ currentItem.exif?.make ? `${currentItem.exif.make} ` : '' }}{{ currentItem.exif?.model || '未记录相机型号' }}
            </div>
            <div v-if="currentItem.exif?.dateTimeOriginal" class="mt-1 text-[11px] font-mono text-[#9E9B93]">
              快门时间: {{ currentItem.exif.dateTimeOriginal }}
            </div>
          </div>

          <div>
            <div class="text-[#9E9B93] mb-2 font-mono text-[11px] uppercase tracking-wider">曝光矩阵</div>
            <div class="grid grid-cols-2 gap-2">
              <div class="rounded-xl border border-[#2E2C28] bg-[#161513]/50 p-2.5">
                <span class="text-[10px] text-[#9E9B93] block">光圈</span>
                <span class="font-mono text-sm font-semibold text-[#E58D76]">
                  {{ currentItem.exif?.fNumber ? `f/${currentItem.exif.fNumber}` : '—' }}
                </span>
              </div>
              <div class="rounded-xl border border-[#2E2C28] bg-[#161513]/50 p-2.5">
                <span class="text-[10px] text-[#9E9B93] block">快门</span>
                <span class="font-mono text-sm font-semibold text-[#F2C97D]">
                  {{ currentItem.exif?.exposureTime || '—' }}
                </span>
              </div>
              <div class="rounded-xl border border-[#2E2C28] bg-[#161513]/50 p-2.5">
                <span class="text-[10px] text-[#9E9B93] block">感光度</span>
                <span class="font-mono text-sm font-semibold text-[#84A58E]">
                  {{ currentItem.exif?.iso ? `ISO ${currentItem.exif.iso}` : '—' }}
                </span>
              </div>
              <div class="rounded-xl border border-[#2E2C28] bg-[#161513]/50 p-2.5">
                <span class="text-[10px] text-[#9E9B93] block">焦距</span>
                <span class="font-mono text-sm font-semibold text-[#F7F5F0]">
                  {{ currentItem.exif?.focalLength ? `${currentItem.exif.focalLength}mm` : '—' }}
                </span>
              </div>
            </div>
          </div>

          <div class="space-y-2 border-t border-[#2E2C28] pt-4">
            <div class="flex items-center justify-between">
              <span class="text-[#9E9B93]">分辨率</span>
              <span class="font-mono text-[#F7F5F0]">
                {{ currentItem.width && currentItem.height ? `${currentItem.width} × ${currentItem.height}` : '自适应' }}
              </span>
            </div>
            <div v-if="currentItem.sizeBytes" class="flex items-center justify-between">
              <span class="text-[#9E9B93]">体积</span>
              <span class="font-mono text-[#F7F5F0]">
                {{ formatSize(currentItem.sizeBytes) }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-[#9E9B93]">权限</span>
              <span
                class="rounded-md px-1.5 py-0.5 text-[10px] font-mono"
                :class="currentItem.visibility === 'private' ? 'bg-amber-500/20 text-amber-300' : 'bg-[#4E6053]/30 text-[#9FC0A8]'"
              >
                {{ currentItem.visibility === 'private' ? '私密仅管理可见' : '公开策展' }}
              </span>
            </div>
          </div>

          <div v-if="currentItem.tags && currentItem.tags.length > 0" class="border-t border-[#2E2C28] pt-4">
            <div class="text-[#9E9B93] mb-2 font-mono text-[11px] uppercase tracking-wider">标签</div>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="tag in currentItem.tags"
                :key="tag"
                class="rounded-lg bg-[#2A2824] px-2 py-0.5 text-[11px] font-mono text-[#D4CEBF] border border-[#3A3732]"
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
  Info as InfoIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Camera as CameraIcon,
  Calendar as CalendarIcon,
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
