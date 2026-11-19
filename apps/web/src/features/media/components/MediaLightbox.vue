<template>
  <Teleport to="body">
    <div
      v-if="modelValue && currentItem"
      class="fixed inset-0 z-50 flex overflow-hidden bg-slate-950/95 backdrop-blur-2xl text-slate-100 select-none animate-in fade-in duration-200"
      tabindex="-1"
      @keydown="handleKeyDown"
      ref="containerRef"
    >
      <!-- Main Content Area (Image + Controls) -->
      <div class="relative flex-1 flex flex-col h-full overflow-hidden">
        <!-- Top Toolbar -->
        <header
          class="absolute top-0 inset-x-0 z-20 flex h-16 items-center justify-between px-4 sm:px-6 bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-transparent pointer-events-none"
        >
          <!-- Left: Title & Index Counter -->
          <div class="pointer-events-auto flex items-center gap-3">
            <span class="rounded-full bg-slate-900/80 px-3 py-1 text-xs font-mono text-slate-300 border border-slate-700/60 shadow">
              {{ currentIndex + 1 }} / {{ items.length }}
            </span>
            <span class="hidden sm:inline-block text-sm font-medium text-slate-200 truncate max-w-xs">
              {{ currentItem.title || '照片详情' }}
            </span>
          </div>

          <!-- Right: Zoom Controls & Toggles -->
          <div class="pointer-events-auto flex items-center gap-2">
            <!-- Zoom Out -->
            <button
              type="button"
              class="rounded-xl p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50 shadow transition-colors disabled:opacity-40"
              :disabled="zoomScale <= 0.6"
              @click="zoomOut"
              title="缩小 (-)"
            >
              <ZoomOutIcon class="w-4 h-4" />
            </button>

            <!-- Reset Zoom -->
            <button
              type="button"
              class="px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-xs font-mono text-slate-300 hover:text-white border border-slate-700/50 shadow transition-colors"
              @click="resetZoom"
              title="重置缩放 (0)"
            >
              {{ Math.round(zoomScale * 100) }}%
            </button>

            <!-- Zoom In -->
            <button
              type="button"
              class="rounded-xl p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50 shadow transition-colors disabled:opacity-40"
              :disabled="zoomScale >= 3.5"
              @click="zoomIn"
              title="放大 (+)"
            >
              <ZoomInIcon class="w-4 h-4" />
            </button>

            <!-- Toggle EXIF Drawer -->
            <button
              type="button"
              class="rounded-xl p-2 border shadow transition-colors"
              :class="[
                showExifDrawer
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/50',
              ]"
              @click="showExifDrawer = !showExifDrawer"
              title="切换 EXIF 元数据信息"
            >
              <InfoIcon class="w-4 h-4" />
            </button>

            <!-- Close Lightbox -->
            <button
              type="button"
              class="rounded-xl p-2 bg-slate-900/80 hover:bg-red-500/20 hover:text-red-400 text-slate-300 border border-slate-700/50 shadow transition-colors ml-2"
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
          <!-- Floating Prev Button -->
          <button
            v-if="hasPrev"
            type="button"
            class="absolute left-4 z-20 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 text-slate-300 hover:text-white border border-slate-700/50 shadow-xl transition-all hover:scale-105"
            @click.stop="prevPhoto"
            title="上一张 (←)"
          >
            <ChevronLeftIcon class="w-6 h-6" />
          </button>

          <!-- The Image Display -->
          <div
            class="relative transition-transform duration-200 ease-out flex items-center justify-center"
            :style="{ transform: `scale(${zoomScale})` }"
          >
            <img
              :src="currentItem.url || currentItem.thumbUrl"
              :alt="currentItem.title || '照片大图预览'"
              class="max-h-[82vh] max-w-[85vw] object-contain rounded-lg shadow-2xl transition-opacity duration-300"
              :class="{ 'opacity-0': !imageLoaded, 'opacity-100': imageLoaded }"
              @load="imageLoaded = true"
            />
            <div
              v-if="!imageLoaded"
              class="absolute inset-0 flex items-center justify-center min-h-[300px] min-w-[300px]"
            >
              <Loader2Icon class="w-8 h-8 text-sky-400 animate-spin" />
            </div>
          </div>

          <!-- Floating Next Button -->
          <button
            v-if="hasNext"
            type="button"
            class="absolute right-4 z-20 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 text-slate-300 hover:text-white border border-slate-700/50 shadow-xl transition-all hover:scale-105"
            @click.stop="nextPhoto"
            title="下一张 (→)"
          >
            <ChevronRightIcon class="w-6 h-6" />
          </button>
        </main>

        <!-- Bottom Caption Bar -->
        <footer
          v-if="currentItem.summary"
          class="absolute bottom-0 inset-x-0 z-20 pointer-events-none p-4 text-center bg-gradient-to-t from-slate-950/90 to-transparent"
        >
          <p class="inline-block pointer-events-auto rounded-xl bg-slate-900/80 px-4 py-2 text-xs sm:text-sm text-slate-200 border border-slate-800/80 shadow backdrop-blur-md max-w-xl truncate">
            {{ currentItem.summary }}
          </p>
        </footer>
      </div>

      <!-- Right Collapsible EXIF Info Drawer -->
      <aside
        v-if="showExifDrawer"
        class="w-80 md:w-88 flex-shrink-0 border-l border-slate-800/80 bg-slate-900/90 backdrop-blur-xl flex flex-col h-full shadow-2xl transition-all animate-in slide-in-from-right duration-200 z-30"
      >
        <!-- Drawer Header -->
        <div class="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
          <div class="flex items-center gap-2 text-sky-400 font-semibold text-sm">
            <CameraIcon class="w-4 h-4" />
            <span>EXIF 拍摄元数据</span>
          </div>
          <button
            type="button"
            class="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            @click="showExifDrawer = false"
          >
            <XIcon class="w-4 h-4" />
          </button>
        </div>

        <!-- Drawer Content -->
        <div class="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-xs text-slate-300">
          <!-- Title & Date -->
          <div>
            <h4 class="text-sm font-semibold text-white leading-snug">
              {{ currentItem.title || '无标题记忆' }}
            </h4>
            <div class="mt-1 flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
              <CalendarIcon class="w-3.5 h-3.5 text-sky-400" />
              <span>{{ formatOccurredAt(currentItem.occurredAt) }}</span>
            </div>
          </div>

          <!-- Camera Model Banner -->
          <div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
            <div class="text-[11px] text-slate-400 flex items-center gap-1.5 mb-1">
              <CameraIcon class="w-3.5 h-3.5 text-emerald-400" />
              <span>相机设备</span>
            </div>
            <div class="text-sm font-semibold text-white">
              {{ currentItem.exif?.make ? `${currentItem.exif.make} ` : '' }}{{ currentItem.exif?.model || '未知相机型号' }}
            </div>
            <div v-if="currentItem.exif?.focalLength" class="mt-1 text-xs text-slate-400">
              等效焦距: {{ currentItem.exif.focalLength }}mm
            </div>
          </div>

          <!-- Photography Exposure Parameters Matrix -->
          <div>
            <div class="text-slate-400 mb-2 font-medium">曝光参数矩阵</div>
            <div class="grid grid-cols-2 gap-2">
              <div class="rounded-xl border border-slate-800/80 bg-slate-950/40 p-2.5">
                <span class="text-[10px] text-slate-500 block">光圈</span>
                <span class="font-mono text-sm font-semibold text-sky-400">
                  {{ currentItem.exif?.fNumber ? `f/${currentItem.exif.fNumber}` : '—' }}
                </span>
              </div>
              <div class="rounded-xl border border-slate-800/80 bg-slate-950/40 p-2.5">
                <span class="text-[10px] text-slate-500 block">快门速度</span>
                <span class="font-mono text-sm font-semibold text-amber-400">
                  {{ currentItem.exif?.exposureTime || '—' }}
                </span>
              </div>
              <div class="rounded-xl border border-slate-800/80 bg-slate-950/40 p-2.5">
                <span class="text-[10px] text-slate-500 block">感光度</span>
                <span class="font-mono text-sm font-semibold text-emerald-400">
                  {{ currentItem.exif?.iso ? `ISO ${currentItem.exif.iso}` : '—' }}
                </span>
              </div>
              <div class="rounded-xl border border-slate-800/80 bg-slate-950/40 p-2.5">
                <span class="text-[10px] text-slate-500 block">焦距</span>
                <span class="font-mono text-sm font-semibold text-indigo-400">
                  {{ currentItem.exif?.focalLength ? `${currentItem.exif.focalLength}mm` : '—' }}
                </span>
              </div>
            </div>
          </div>

          <!-- File Dimensions & Attributes -->
          <div class="space-y-2 border-t border-slate-800/80 pt-4">
            <div class="flex items-center justify-between">
              <span class="text-slate-400">原始分辨率</span>
              <span class="font-mono text-slate-200">
                {{ currentItem.width && currentItem.height ? `${currentItem.width} × ${currentItem.height}` : '自适应' }}
              </span>
            </div>
            <div v-if="currentItem.sizeBytes" class="flex items-center justify-between">
              <span class="text-slate-400">文件大小</span>
              <span class="font-mono text-slate-200">
                {{ formatSize(currentItem.sizeBytes) }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">公开权限</span>
              <span
                class="rounded-md px-1.5 py-0.5 text-[10px] font-mono"
                :class="currentItem.visibility === 'private' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'"
              >
                {{ currentItem.visibility === 'private' ? '私密仅管理可见' : '公开只读' }}
              </span>
            </div>
          </div>

          <!-- Tags -->
          <div v-if="currentItem.tags && currentItem.tags.length > 0" class="border-t border-slate-800/80 pt-4">
            <div class="text-slate-400 mb-2 font-medium">标签归档</div>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="tag in currentItem.tags"
                :key="tag"
                class="rounded-lg bg-slate-800/80 px-2 py-0.5 text-[11px] text-slate-300 border border-slate-700/60"
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
  ChevronRightIcon,
  Camera as CameraIcon,
  Calendar as CalendarIcon,
  Loader2 as Loader2Icon,
} from 'lucide-vue-next';
import { formatFileSize, type ExifMetadata } from '@/shared/utils/image-processor';
import { formatDateTime, formatDate } from '@archive/shared';

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
  }>(),
  {
    initialIndex: 0,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'change', index: number): void;
}>();

const containerRef = ref<HTMLElement | null>(null);
const currentIndex = ref(props.initialIndex);
const zoomScale = ref(1.0);
const showExifDrawer = ref(false);
const imageLoaded = ref(false);

const currentItem = computed<LightboxItem | null>(() => {
  if (props.items.length === 0) return null;
  return props.items[currentIndex.value] ?? null;
});

const hasPrev = computed(() => currentIndex.value > 0);
const hasNext = computed(() => currentIndex.value < props.items.length - 1);

watch(
  () => props.initialIndex,
  (newIdx) => {
    currentIndex.value = Math.max(0, Math.min(newIdx, props.items.length - 1));
    resetZoom();
  }
);

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      resetZoom();
      imageLoaded.value = false;
      nextTick(() => {
        containerRef.value?.focus();
      });
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }
);

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
  resetZoom();
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
