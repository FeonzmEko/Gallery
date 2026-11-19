<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    role="dialog"
    aria-modal="true"
  >
    <!-- Backdrop -->
    <div
      class="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
      @click="handleClose"
    ></div>

    <!-- Modal Container -->
    <div
      class="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-[#E5E1D8] bg-[#F7F5F0] shadow-2xl overflow-hidden"
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-[#E5E1D8] px-6 py-4 bg-white">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FDF8F6] text-[#C25438] border border-[#F0D5CD]">
            <UploadCloudIcon class="w-5 h-5" />
          </div>
          <div>
            <h3 class="font-serif text-lg font-medium text-[#1D1C1A]">多照片并发直传</h3>
            <p class="text-xs text-[#747169]">
              本地 Canvas 预压缩 WebP (<100KB) · 预签名安全直传 R2 / 对象存储
            </p>
          </div>
        </div>

        <button
          type="button"
          class="rounded-lg p-2 text-[#747169] hover:text-[#1D1C1A] hover:bg-[#EFECE4] transition-colors"
          @click="handleClose"
        >
          <XIcon class="w-5 h-5" />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <!-- Settings Bar -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-white border border-[#E5E1D8] text-xs">
          <!-- Visibility Selector -->
          <div class="flex items-center justify-between sm:justify-start gap-3">
            <span class="text-[#747169]">公开权限:</span>
            <div class="inline-flex rounded-lg bg-[#F7F5F0] p-1 border border-[#E5E1D8]">
              <button
                type="button"
                class="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                :class="uploadVisibility === 'public' ? 'bg-white text-[#C25438] shadow-xs font-semibold' : 'text-[#747169] hover:text-[#1D1C1A]'"
                @click="uploadVisibility = 'public'"
              >
                公开访问
              </button>
              <button
                type="button"
                class="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                :class="uploadVisibility === 'private' ? 'bg-white text-amber-800 shadow-xs font-semibold' : 'text-[#747169] hover:text-[#1D1C1A]'"
                @click="uploadVisibility = 'private'"
              >
                私密隐藏
              </button>
            </div>
          </div>

          <!-- Auto Create Entry Toggle -->
          <div v-if="!targetEntryId" class="flex items-center justify-between sm:justify-end gap-2">
            <label class="flex items-center gap-2 cursor-pointer text-[#1D1C1A]">
              <input
                type="checkbox"
                v-model="createTimelineEntry"
                class="rounded border-[#D4CEBF] text-[#C25438] focus:ring-[#C25438]"
              />
              <span>同步生成时间线记忆卡片</span>
            </label>
          </div>
        </div>

        <!-- Drag & Drop Upload Zone -->
        <div
          class="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 cursor-pointer"
          :class="[
            isDragging
              ? 'border-[#C25438] bg-[#FDF8F6]'
              : 'border-[#D4CEBF] hover:border-[#C25438]/50 bg-white hover:bg-[#FDF8F6]/30',
          ]"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
          @click="triggerFileInput"
        >
          <input
            ref="fileInputRef"
            type="file"
            multiple
            accept="image/*"
            class="hidden"
            @change="handleFileInputChange"
          />

          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7F5F0] border border-[#E5E1D8] shadow-xs mb-3">
            <ImageIcon class="w-6 h-6 text-[#C25438]" />
          </div>

          <p class="text-sm font-medium text-[#1D1C1A]">
            拖拽单张或多张照片至此处，或
            <span class="text-[#C25438] hover:underline">点击选择文件</span>
          </p>
          <p class="mt-1 text-xs text-[#747169]">
            支持 JPG, PNG, WebP, AVIF, HEIC · 自动提取拍摄时间、相机 EXIF 并并发压缩
          </p>
        </div>

        <!-- Queue List -->
        <div v-if="queue.length > 0" class="space-y-3">
          <div class="flex items-center justify-between text-xs text-[#747169] px-1 font-mono">
            <span>待传列表 ({{ queue.length }} 张照片)</span>
            <div class="flex items-center gap-3">
              <button
                v-if="hasCompletedTasks"
                type="button"
                class="text-xs text-[#747169] hover:text-[#1D1C1A] transition-colors"
                @click="clearCompleted"
              >
                清理已完成
              </button>
              <button
                v-if="hasFailedTasks"
                type="button"
                class="text-xs text-[#C25438] hover:underline transition-colors"
                @click="retryFailed"
              >
                重试失败项
              </button>
            </div>
          </div>

          <div class="space-y-2 max-h-60 overflow-y-auto pr-1">
            <div
              v-for="item in queue"
              :key="item.id"
              class="flex items-center gap-3 rounded-xl border border-[#E5E1D8] bg-white p-2.5 shadow-xs transition-all"
            >
              <!-- Thumbnail preview -->
              <div class="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-[#E5E1D8] bg-[#F7F5F0]">
                <img
                  v-if="item.previewUrl"
                  :src="item.previewUrl"
                  :alt="item.name"
                  class="h-full w-full object-cover"
                />
                <div v-else class="flex h-full w-full items-center justify-center text-[#9E9B93]">
                  <ImageIcon class="w-5 h-5" />
                </div>
              </div>

              <!-- Info & Progress -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs font-medium text-[#1D1C1A] truncate">{{ item.name }}</span>
                  <span class="text-[11px] font-mono" :class="statusColorClass(item.status)">
                    {{ statusText(item) }}
                  </span>
                </div>

                <div class="mt-1 flex items-center gap-2 text-[10px] text-[#747169] font-mono">
                  <span>{{ formatFileSize(item.size) }}</span>
                  <span v-if="item.processedSize">➔ WebP {{ formatFileSize(item.processedSize) }}</span>
                  <span v-if="item.exif?.model" class="truncate">• {{ item.exif.model }}</span>
                </div>

                <!-- Progress Bar -->
                <div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#EFECE4]">
                  <div
                    class="h-full transition-all duration-300"
                    :class="[
                      item.status === 'error'
                        ? 'bg-red-500'
                        : item.status === 'success'
                        ? 'bg-emerald-600'
                        : 'bg-[#C25438]',
                    ]"
                    :style="{ width: `${item.progress}%` }"
                  ></div>
                </div>
              </div>

              <!-- Remove / Cancel action -->
              <button
                v-if="item.status !== 'uploading' && item.status !== 'compressing'"
                type="button"
                class="p-1 text-[#9E9B93] hover:text-[#1D1C1A] transition-colors"
                @click="removeFromQueue(item.id)"
                title="移除"
              >
                <XIcon class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="flex items-center justify-between border-t border-[#E5E1D8] px-6 py-4 bg-white">
        <div class="text-xs text-[#747169]">
          <span v-if="isProcessing" class="flex items-center gap-2 text-[#C25438] font-mono">
            <Loader2Icon class="w-4 h-4 animate-spin" />
            <span>并发处理中...</span>
          </span>
          <span v-else-if="queue.length === 0">请选择或拖入图片</span>
          <span v-else class="font-mono">共 {{ queue.length }} 项待处理</span>
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            class="px-4 py-2 rounded-xl text-xs font-medium text-[#747169] hover:bg-[#F7F5F0] transition-colors"
            @click="handleClose"
          >
            {{ hasCompletedTasks ? '完成' : '取消' }}
          </button>
          <button
            v-if="hasPendingTasks"
            type="button"
            class="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#C25438] text-xs font-semibold text-white hover:bg-[#A9442C] transition-colors shadow-sm disabled:opacity-50"
            :disabled="isProcessing"
            @click="startUploadQueue"
          >
            <UploadCloudIcon class="w-3.5 h-3.5" />
            <span>开始并发上传</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  UploadCloud as UploadCloudIcon,
  X as XIcon,
  Image as ImageIcon,
  Loader2 as Loader2Icon,
} from 'lucide-vue-next';
import { apiClient } from '@/shared/api/client';
import {
  processImageFile,
  formatFileSize,
  type ExifMetadata,
  type ProcessedImageResult,
} from '@/shared/utils/image-processor';
import type { MediaAssetDto, UploadTicketDto, EntryDto } from '@archive/contracts';
import { generateUlid } from '@archive/shared';

const props = defineProps<{
  modelValue: boolean;
  targetEntryId?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'uploaded', assets: MediaAssetDto[]): void;
  (e: 'entry-created', entry: EntryDto): void;
}>();

type TaskStatus = 'pending' | 'compressing' | 'requesting' | 'uploading' | 'confirming' | 'success' | 'error';

interface QueueItem {
  id: string;
  file: File;
  name: string;
  size: number;
  processedSize?: number;
  previewUrl: string;
  status: TaskStatus;
  progress: number;
  errorMsg?: string;
  exif?: ExifMetadata;
  processedResult?: ProcessedImageResult;
  asset?: MediaAssetDto;
}

const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const isProcessing = ref(false);
const queue = ref<QueueItem[]>([]);
const uploadVisibility = ref<'public' | 'private'>('public');
const createTimelineEntry = ref(true);

const hasCompletedTasks = computed(() => queue.value.some((t) => t.status === 'success'));
const hasPendingTasks = computed(() => queue.value.some((t) => t.status === 'pending' || t.status === 'error'));
const hasFailedTasks = computed(() => queue.value.some((t) => t.status === 'error'));

function handleClose() {
  if (isProcessing.value) {
    if (!confirm('上传正在进行中，确认退出吗？')) return;
  }
  emit('update:modelValue', false);
}

function triggerFileInput() {
  fileInputRef.value?.click();
}

function handleFileInputChange(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    addFilesToQueue(Array.from(target.files));
    target.value = '';
  }
}

function handleDrop(e: DragEvent) {
  isDragging.value = false;
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    addFilesToQueue(Array.from(e.dataTransfer.files));
  }
}

function addFilesToQueue(files: File[]) {
  const imageFiles = files.filter((f) => f.type.startsWith('image/'));
  for (const file of imageFiles) {
    const previewUrl = URL.createObjectURL(file);
    queue.value.push({
      id: generateUlid(),
      file,
      name: file.name,
      size: file.size,
      previewUrl,
      status: 'pending',
      progress: 0,
    });
  }
}

function removeFromQueue(id: string) {
  const idx = queue.value.findIndex((q) => q.id === id);
  if (idx !== -1) {
    URL.revokeObjectURL(queue.value[idx].previewUrl);
    queue.value.splice(idx, 1);
  }
}

function clearCompleted() {
  queue.value = queue.value.filter((q) => q.status !== 'success');
}

function retryFailed() {
  for (const item of queue.value) {
    if (item.status === 'error') {
      item.status = 'pending';
      item.progress = 0;
      item.errorMsg = undefined;
    }
  }
  startUploadQueue();
}

function statusText(item: QueueItem): string {
  switch (item.status) {
    case 'pending':
      return '等待上传';
    case 'compressing':
      return 'WebP 压缩中...';
    case 'requesting':
      return '获取凭证...';
    case 'uploading':
      return `直传中 ${item.progress}%`;
    case 'confirming':
      return '记录元数据...';
    case 'success':
      return '完成';
    case 'error':
      return item.errorMsg || '失败';
  }
}

function statusColorClass(status: TaskStatus): string {
  switch (status) {
    case 'pending':
      return 'text-slate-400';
    case 'compressing':
    case 'requesting':
    case 'uploading':
    case 'confirming':
      return 'text-sky-400';
    case 'success':
      return 'text-emerald-400';
    case 'error':
      return 'text-red-400';
  }
}

/**
 * Concurrency worker: process up to 3 uploads concurrently.
 */
async function startUploadQueue() {
  if (isProcessing.value) return;
  isProcessing.value = true;

  const CONCURRENCY = 3;
  const uploadedAssets: MediaAssetDto[] = [];

  const getNextPendingItem = () => queue.value.find((i) => i.status === 'pending');

  const worker = async () => {
    while (true) {
      const item = getNextPendingItem();
      if (!item) break;
      await processSingleItem(item, uploadedAssets);
    }
  };

  try {
    const workers = Array.from({ length: CONCURRENCY }, () => worker());
    await Promise.all(workers);

    if (uploadedAssets.length > 0) {
      emit('uploaded', uploadedAssets);
    }
  } finally {
    isProcessing.value = false;
  }
}

async function processSingleItem(item: QueueItem, uploadedList: MediaAssetDto[]) {
  try {
    // 1. Process & Compress image to WebP (<100KB)
    item.status = 'compressing';
    item.progress = 15;
    const processed = await processImageFile(item.file, {
      maxWidth: 1600,
      maxHeight: 1600,
      maxSizeBytes: 100 * 1024,
      format: 'image/webp',
    });
    item.processedResult = processed;
    item.processedSize = processed.sizeBytes;
    item.exif = processed.exif;
    if (processed.dataUrl) {
      item.previewUrl = processed.dataUrl;
    }

    // 2. Request Presigned Upload Ticket
    item.status = 'requesting';
    item.progress = 30;

    const ticket = await apiClient.post<UploadTicketDto>('/api/v1/media/upload-url', {
      filename: `${item.name.replace(/\.[^/.]+$/, '')}.webp`,
      contentType: 'image/webp',
      sizeBytes: processed.sizeBytes,
      mediaType: 'image',
      width: processed.width,
      height: processed.height,
      visibility: uploadVisibility.value,
    });

    // 3. Direct Storage PUT Upload
    item.status = 'uploading';
    item.progress = 50;

    await directUploadToStorage(ticket.uploadUrl, processed.blob, ticket.headers, (percent) => {
      item.progress = 50 + Math.round(percent * 0.35); // 50% to 85%
    });

    // 4. Confirm Upload with Metadata
    item.status = 'confirming';
    item.progress = 90;

    const asset = await apiClient.post<MediaAssetDto>(`/api/v1/media/${ticket.mediaId}/confirm`, {
      width: processed.width,
      height: processed.height,
      thumbKey: ticket.bucketKey,
    });
    item.asset = asset;

    // 5. Optional Bind or Entry Creation
    if (props.targetEntryId) {
      await apiClient.post('/api/v1/media/bind', {
        entryId: props.targetEntryId,
        mediaId: asset.id,
        role: 'gallery',
      });
    } else if (createTimelineEntry.value) {
      // Determine occurredAt from EXIF DateTimeOriginal or DateTime or current time
      let occurredAt = Date.now();
      if (processed.exif.dateTimeOriginal || processed.exif.dateTime) {
        const rawDate = (processed.exif.dateTimeOriginal || processed.exif.dateTime)!.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
        const parsedTimestamp = new Date(rawDate).getTime();
        if (!isNaN(parsedTimestamp) && parsedTimestamp > 0) {
          occurredAt = parsedTimestamp;
        }
      }

      const entry = await apiClient.post<EntryDto>('/api/v1/entries', {
        type: 'photo',
        title: item.name.replace(/\.[^/.]+$/, ''),
        summary: processed.exif.model ? `拍摄于 ${processed.exif.model}` : null,
        coverMediaId: asset.id,
        occurredAt,
        visibility: uploadVisibility.value,
        status: 'published',
        tags: ['摄影', '生活'],
      });

      emit('entry-created', entry);
    }

    item.progress = 100;
    item.status = 'success';
    uploadedList.push(asset);
  } catch (err: any) {
    item.status = 'error';
    item.errorMsg = err.message || '上传失败';
  }
}

/**
 * Direct PUT upload with progress reporting via XMLHttpRequest.
 */
function directUploadToStorage(
  url: string,
  blob: Blob,
  headers?: Record<string, string>,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    // If mock upload url (internal fallback)
    if (url.includes('mock-signed=true') || url.includes('.internal/')) {
      let current = 0;
      const interval = setInterval(() => {
        current += 30;
        if (onProgress) onProgress(Math.min(100, current));
        if (current >= 100) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);

    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        xhr.setRequestHeader(k, v);
      }
    }

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Storage PUT failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during direct storage upload'));
    xhr.send(blob);
  });
}
</script>
