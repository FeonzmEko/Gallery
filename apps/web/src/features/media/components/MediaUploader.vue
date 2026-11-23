<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="fixed inset-0 bg-[#161513]/55 backdrop-blur-xs transition-opacity"
        @click="handleClose"
      ></div>

      <div
        class="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[2px] border border-[#DDD6C9] bg-[#F3EFE7] shadow-2xl overflow-hidden"
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-[#DDD6C9] px-6 py-4 bg-[#FAF8F4]">
          <div class="space-y-0.5">
            <span class="kicker-caps text-[#9A3F2B] block">DARKROOM INGESTION</span>
            <h3 class="font-serif text-lg font-normal text-[#161513]">多照片并发直传</h3>
            <p class="text-[11px] text-[#787268] font-light">
              浏览器 Canvas 预压缩 WebP (&lt;100KB) · 自动提取 EXIF 参数直传 R2
            </p>
          </div>

          <button
            type="button"
            class="p-2 text-[#787268] hover:text-[#161513] transition-colors"
            @click="handleClose"
          >
            <XIcon class="w-5 h-5" />
          </button>
        </div>

        <!-- Modal Body -->
        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <!-- Settings Bar -->
          <div class="space-y-3.5 p-4 rounded-[2px] bg-[var(--alabaster)] border border-[var(--rule)] text-xs">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="flex items-center justify-between sm:justify-start gap-3">
                <span class="kicker-caps text-[#787268]">ACCESS</span>
                <div class="inline-flex border border-[#DDD6C9] rounded-[2px] bg-[#F3EFE7]">
                  <button
                    type="button"
                    class="px-3 py-1 text-xs font-serif transition-colors"
                    :class="uploadVisibility === 'public' ? 'bg-[#161513] text-[#FAF8F4]' : 'text-[#787268] hover:text-[#161513]'"
                    @click="uploadVisibility = 'public'"
                  >
                    公开访问
                  </button>
                  <button
                    type="button"
                    class="px-3 py-1 border-l border-[#DDD6C9] text-xs font-serif transition-colors"
                    :class="uploadVisibility === 'private' ? 'bg-[#9A6B2F] text-[#FAF8F4]' : 'text-[#787268] hover:text-[#161513]'"
                    @click="uploadVisibility = 'private'"
                  >
                    私密隐藏
                  </button>
                </div>
              </div>

              <div v-if="!targetEntryId" class="flex items-center justify-between sm:justify-end gap-2">
                <label class="flex items-center gap-2 cursor-pointer text-[var(--ink)] font-serif">
                  <input
                    type="checkbox"
                    v-model="createTimelineEntry"
                    class="rounded-[2px] border-[#C4BBA9] text-[#9A3F2B] focus:ring-[#9A3F2B]"
                  />
                  <span>同步生成时间线摄影条目</span>
                </label>
              </div>
            </div>

            <!-- M3-5: Travel Collection Assignment / Quick Create -->
            <div v-if="!targetEntryId" class="pt-3 border-t border-[var(--rule)] space-y-3">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div class="flex items-center gap-2.5 flex-1 min-w-0">
                  <FolderPlusIcon class="w-3.5 h-3.5 text-[var(--seal)] shrink-0" />
                  <span class="kicker-caps text-[var(--ink-muted)] shrink-0">COLLECTION</span>
                  <select
                    v-model="selectedCollectionId"
                    :disabled="isLoadingCollections || isProcessing"
                    class="flex-1 min-w-0 editorial-field px-2.5 py-1.5 text-xs font-serif"
                    aria-label="归属旅行合集"
                  >
                    <option value="">不归属合集（仅存入影像长廊）</option>
                    <option
                      v-for="col in collections"
                      :key="col.id"
                      :value="col.id"
                    >
                      {{ col.title }}{{ col.occurredRange ? ` · ${col.occurredRange}` : '' }}{{ col.visibility === 'private' ? ' [私密]' : '' }}
                    </option>
                  </select>
                </div>

                <button
                  type="button"
                  class="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[2px] border border-[var(--rule-strong)] text-[11px] font-serif text-[var(--ink)] hover:border-[var(--seal)] hover:text-[var(--seal)] transition-colors shrink-0"
                  @click="toggleNewCollectionForm"
                >
                  <PlusIcon class="w-3 h-3" />
                  <span>{{ showNewCollectionForm ? '收起新建' : '快捷新建合集' }}</span>
                </button>
              </div>

              <!-- Inline Quick Create Collection Form -->
              <div
                v-if="showNewCollectionForm"
                class="p-3.5 rounded-[2px] border border-[var(--rule)] bg-[var(--canvas)]/70 space-y-2.5"
              >
                <div class="flex items-center justify-between">
                  <span class="kicker-caps text-[var(--seal)]">NEW TRAVEL COLLECTION</span>
                  <span class="text-[10px] font-mono text-[var(--ink-muted)]">
                    可见性默认跟随当前「{{ uploadVisibility === 'private' ? '私密' : '公开' }}」设置
                  </span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    v-model="newCollectionForm.title"
                    type="text"
                    maxlength="200"
                    placeholder="合集标题 *（如：青海湖）"
                    class="editorial-field px-2.5 py-1.5 text-xs"
                  />
                  <input
                    v-model="newCollectionForm.occurredRange"
                    type="text"
                    maxlength="100"
                    placeholder="发生区间（可选，如：2026-07 · 青海湖）"
                    class="editorial-field px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <input
                    v-model="newCollectionForm.description"
                    type="text"
                    maxlength="1000"
                    placeholder="合集简介或旅途前言（可选）"
                    class="flex-1 editorial-field px-2.5 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    :disabled="isCreatingCollection || !newCollectionForm.title.trim()"
                    class="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-[2px] bg-[var(--ink)] text-[var(--alabaster)] text-xs font-serif hover:bg-[var(--seal)] transition-colors disabled:opacity-40 shrink-0"
                    @click="handleCreateCollection"
                  >
                    <Loader2Icon v-if="isCreatingCollection" class="w-3 h-3 animate-spin" />
                    <span>创建并选中</span>
                  </button>
                </div>
              </div>

              <!-- Unbound Assets Retry Banner (if batch bind failed) -->
              <div
                v-if="unboundAssets.length > 0"
                class="flex items-center justify-between gap-3 px-3 py-2 rounded-[2px] border border-[var(--seal)]/40 bg-[var(--seal)]/10 text-[11px]"
              >
                <span class="font-serif text-[var(--seal)]">
                  有 {{ unboundAssets.length }} 张已上传影像尚未完成合集归属。
                </span>
                <button
                  type="button"
                  :disabled="isBindingCollection"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] bg-[var(--seal)] text-[#FAF8F4] font-serif hover:opacity-90 disabled:opacity-50 shrink-0"
                  @click="retryBindUnboundAssets"
                >
                  <Loader2Icon v-if="isBindingCollection" class="w-3 h-3 animate-spin" />
                  <span>重试归属</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Drag & Drop Upload Zone -->
          <div
            class="relative flex flex-col items-center justify-center rounded-[2px] border border-dashed p-10 text-center transition-all duration-200 cursor-pointer"
            :class="[
              isDragging
                ? 'border-[#9A3F2B] bg-[#FAF4F2]'
                : 'border-[#C4BBA9] hover:border-[#161513] bg-[#FAF8F4]',
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

            <div class="relative w-12 h-10 flex items-center justify-center mb-4 border border-[#DDD6C9]">
              <ImageIcon class="w-5 h-5 text-[#9A3F2B]" />
            </div>

            <p class="font-serif text-sm text-[#161513]">
              拖拽单张或多张影像至此处，或
              <span class="text-[#9A3F2B] underline underline-offset-4">点击择取原片</span>
            </p>
            <p class="mt-2 text-[11px] text-[#787268] font-mono">
              JPG · PNG · WebP · AVIF · HEIC — 自动保留相机 EXIF 参数与拍摄时间
            </p>
          </div>

          <!-- Queue List -->
          <div v-if="queue.length > 0" class="space-y-3">
            <div class="flex items-center justify-between text-xs text-[#787268] font-mono">
              <span>QUEUE ({{ queue.length }})</span>
              <div class="flex items-center gap-4">
                <button
                  v-if="hasCompletedTasks"
                  type="button"
                  class="text-[11px] text-[#787268] hover:text-[#161513]"
                  @click="clearCompleted"
                >
                  清理已完成
                </button>
                <button
                  v-if="hasFailedTasks"
                  type="button"
                  class="text-[11px] text-[#9A3F2B] hover:underline"
                  @click="retryFailed"
                >
                  重试失败项
                </button>
              </div>
            </div>

            <div class="divide-y divide-[#E8E2D6] border border-[#DDD6C9] bg-[#FAF8F4] max-h-60 overflow-y-auto">
              <div
                v-for="item in queue"
                :key="item.id"
                class="flex items-center gap-3.5 p-3"
              >
                <div class="relative h-12 w-12 flex-shrink-0 overflow-hidden border border-[#DDD6C9] bg-[#F3EFE7]">
                  <img
                    v-if="item.previewUrl"
                    :src="item.previewUrl"
                    :alt="item.name"
                    class="h-full w-full object-cover"
                  />
                  <div v-else class="flex h-full w-full items-center justify-center text-[#9B9488]">
                    <ImageIcon class="w-5 h-5" />
                  </div>
                </div>

                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-xs font-serif text-[#161513] truncate">{{ item.name }}</span>
                    <span class="text-[11px] font-mono shrink-0" :class="statusColorClass(item.status)">
                      {{ statusText(item) }}
                    </span>
                  </div>

                  <div class="mt-1 flex items-center gap-2 text-[10px] text-[#787268] font-mono tabular-nums">
                    <span>{{ formatFileSize(item.size) }}</span>
                    <span v-if="item.processedSize">&rarr; WebP {{ formatFileSize(item.processedSize) }}</span>
                    <span v-if="item.exif?.model" class="truncate">· {{ item.exif.model }}</span>
                  </div>

                  <div class="mt-1.5 h-[2px] w-full overflow-hidden bg-[#EAE4D8]">
                    <div
                      class="h-full transition-all duration-300"
                      :class="[
                        item.status === 'error'
                          ? 'bg-red-700'
                          : item.status === 'success'
                          ? 'bg-[#3D4E42]'
                          : 'bg-[#9A3F2B]',
                      ]"
                      :style="{ width: `${item.progress}%` }"
                    ></div>
                  </div>
                </div>

                <button
                  v-if="item.status !== 'uploading' && item.status !== 'compressing'"
                  type="button"
                  class="p-1 text-[#9B9488] hover:text-[#161513] transition-colors"
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
        <div class="flex items-center justify-between border-t border-[#DDD6C9] px-6 py-4 bg-[#FAF8F4]">
          <div class="text-xs text-[#787268]">
            <span v-if="isProcessing" class="flex items-center gap-2 text-[#9A3F2B] font-mono">
              <Loader2Icon class="w-3.5 h-3.5 animate-spin" />
              <span>PROCESSING...</span>
            </span>
            <span v-else-if="queue.length === 0" class="font-serif">请选择或拖入图片</span>
            <span v-else class="font-mono">共 {{ queue.length }} 项待处理</span>
          </div>

          <div class="flex items-center gap-3">
            <button
              type="button"
              class="px-4 py-2 text-xs font-serif tracking-wider text-[#787268] hover:text-[#161513] transition-colors"
              @click="handleClose"
            >
              {{ hasCompletedTasks ? '完成' : '取消' }}
            </button>
            <button
              v-if="hasPendingTasks"
              type="button"
              class="inline-flex items-center gap-2 px-6 py-2.5 rounded-[2px] bg-[#161513] text-xs font-serif tracking-[0.14em] text-[#FAF8F4] hover:bg-[#9A3F2B] transition-colors disabled:opacity-40"
              :disabled="isProcessing"
              @click="startUploadQueue"
            >
              <UploadCloudIcon class="w-3.5 h-3.5" />
              <span>开始并发直传</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import {
  UploadCloud as UploadCloudIcon,
  X as XIcon,
  Image as ImageIcon,
  Loader2 as Loader2Icon,
  FolderPlus as FolderPlusIcon,
  Plus as PlusIcon,
} from 'lucide-vue-next';
import { apiClient, getStoredToken } from '@/shared/api/client';
import { useUiStore } from '@/shared/stores/ui.store';
import {
  processImageFile,
  formatFileSize,
  type ExifMetadata,
  type ProcessedImageResult,
} from '@/shared/utils/image-processor';
import type {
  MediaAssetDto,
  UploadTicketDto,
  EntryDto,
  MediaCollectionDto,
} from '@archive/contracts';
import { generateUlid } from '@archive/shared';

const props = defineProps<{
  modelValue: boolean;
  targetEntryId?: string;
  defaultCollectionId?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'uploaded', assets: MediaAssetDto[]): void;
  (e: 'entry-created', entry: EntryDto): void;
  (e: 'collection-updated', collectionId: string): void;
}>();

const uiStore = useUiStore();

type TaskStatus = 'pending' | 'compressing' | 'requesting' | 'uploading' | 'confirming' | 'success' | 'error';

interface QueueItem {
  id: string;
  file: File;
  name: string;
  size: number;
  processedSize?: number;
  previewUrl: string;
  isObjectUrl: boolean;
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

const collections = ref<MediaCollectionDto[]>([]);
const isLoadingCollections = ref(false);
const selectedCollectionId = ref('');
const showNewCollectionForm = ref(false);
const isCreatingCollection = ref(false);
const isBindingCollection = ref(false);
const unboundAssets = ref<MediaAssetDto[]>([]);
const newCollectionForm = ref({
  title: '',
  occurredRange: '',
  description: '',
});

const hasCompletedTasks = computed(() => queue.value.some((t) => t.status === 'success'));
const hasPendingTasks = computed(() => queue.value.some((t) => t.status === 'pending' || t.status === 'error'));
const hasFailedTasks = computed(() => queue.value.some((t) => t.status === 'error'));

async function loadCollections() {
  if (props.targetEntryId) return;
  isLoadingCollections.value = true;
  try {
    collections.value = await apiClient.listCollections();
    if (
      props.defaultCollectionId &&
      collections.value.some((c) => c.id === props.defaultCollectionId)
    ) {
      selectedCollectionId.value = props.defaultCollectionId;
    }
  } catch {
    // Non-blocking: uploader remains usable even if collection list fails to load
  } finally {
    isLoadingCollections.value = false;
  }
}

function toggleNewCollectionForm() {
  showNewCollectionForm.value = !showNewCollectionForm.value;
}

async function handleCreateCollection() {
  const title = newCollectionForm.value.title.trim();
  if (!title || isCreatingCollection.value) return;

  isCreatingCollection.value = true;
  try {
    const created = await apiClient.createCollection({
      title,
      occurredRange: newCollectionForm.value.occurredRange.trim() || null,
      description: newCollectionForm.value.description.trim() || null,
      visibility: uploadVisibility.value,
    });
    collections.value = [created, ...collections.value];
    selectedCollectionId.value = created.id;
    newCollectionForm.value = { title: '', occurredRange: '', description: '' };
    showNewCollectionForm.value = false;
    emit('collection-updated', created.id);
    uiStore.notifySuccess(`已新建旅行合集「${created.title}」`);
  } catch (err: any) {
    uiStore.notifyError(err?.message || '新建合集失败');
  } finally {
    isCreatingCollection.value = false;
  }
}

async function bindAssetsToCollection(collectionId: string, assets: MediaAssetDto[]): Promise<boolean> {
  if (!collectionId || assets.length === 0) return true;
  isBindingCollection.value = true;
  try {
    const targetCol = collections.value.find((c) => c.id === collectionId);
    const baseOrder = targetCol?.mediaCount ?? 0;
    const detail = await apiClient.bindCollectionMedia(collectionId, {
      items: assets.map((asset, idx) => ({
        mediaAssetId: asset.id,
        sortOrder: baseOrder + idx,
      })),
      replace: false,
    });
    if (targetCol) {
      targetCol.mediaCount = detail.collection.mediaCount ?? baseOrder + assets.length;
    }
    const boundIds = new Set(assets.map((a) => a.id));
    unboundAssets.value = unboundAssets.value.filter((a) => !boundIds.has(a.id));
    emit('collection-updated', collectionId);
    return true;
  } catch (err: any) {
    const existingIds = new Set(unboundAssets.value.map((a) => a.id));
    for (const asset of assets) {
      if (!existingIds.has(asset.id)) {
        unboundAssets.value.push(asset);
      }
    }
    uiStore.notifyError(err?.message || '照片已上传，但归属合集失败，可点击重试归属');
    return false;
  } finally {
    isBindingCollection.value = false;
  }
}

async function retryBindUnboundAssets() {
  if (!selectedCollectionId.value || unboundAssets.value.length === 0 || isBindingCollection.value) {
    return;
  }
  const count = unboundAssets.value.length;
  const ok = await bindAssetsToCollection(selectedCollectionId.value, [...unboundAssets.value]);
  if (ok) {
    const targetCol = collections.value.find((c) => c.id === selectedCollectionId.value);
    uiStore.notifySuccess(
      `已将 ${count} 张影像归入「${targetCol?.title || '所选合集'}」`
    );
  }
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen && !props.targetEntryId) {
      if (props.defaultCollectionId) {
        selectedCollectionId.value = props.defaultCollectionId;
      }
      loadCollections();
    }
  }
);

watch(
  () => props.defaultCollectionId,
  (newId) => {
    if (newId && props.modelValue && !props.targetEntryId) {
      selectedCollectionId.value = newId;
    }
  }
);

async function handleClose() {
  if (isProcessing.value) {
    const ok = await uiStore.confirm({
      title: '上传仍在进行中',
      message: '关闭弹窗将中断尚未完成的上传提示，确定要退出吗？',
      confirmLabel: '确认退出',
      danger: true,
    });
    if (!ok) return;
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
  if (imageFiles.length === 0) {
    uiStore.notifyError('请选择有效的图片文件');
    return;
  }
  for (const file of imageFiles) {
    const previewUrl = URL.createObjectURL(file);
    queue.value.push({
      id: generateUlid(),
      file,
      name: file.name,
      size: file.size,
      previewUrl,
      isObjectUrl: true,
      status: 'pending',
      progress: 0,
    });
  }
}

function revokeItemUrl(item: QueueItem) {
  if (item.isObjectUrl && item.previewUrl.startsWith('blob:')) {
    URL.revokeObjectURL(item.previewUrl);
  }
}

function removeFromQueue(id: string) {
  const idx = queue.value.findIndex((q) => q.id === id);
  if (idx !== -1) {
    revokeItemUrl(queue.value[idx]);
    queue.value.splice(idx, 1);
  }
}

function clearCompleted() {
  queue.value = queue.value.filter((q) => {
    if (q.status === 'success') {
      revokeItemUrl(q);
      return false;
    }
    return true;
  });
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
      return 'text-[#787268]';
    case 'compressing':
    case 'requesting':
    case 'uploading':
    case 'confirming':
      return 'text-[#9A3F2B]';
    case 'success':
      return 'text-[#3D4E42] font-medium';
    case 'error':
      return 'text-red-700';
  }
}

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
      if (!props.targetEntryId && selectedCollectionId.value) {
        const boundOk = await bindAssetsToCollection(selectedCollectionId.value, uploadedAssets);
        if (boundOk) {
          const targetCol = collections.value.find((c) => c.id === selectedCollectionId.value);
          uiStore.notifySuccess(
            `成功上传 ${uploadedAssets.length} 张影像并归入「${targetCol?.title || '旅行合集'}」`
          );
        }
      } else {
        uiStore.notifySuccess(`成功上传 ${uploadedAssets.length} 张影像`);
      }
      emit('uploaded', uploadedAssets);
    }
  } finally {
    isProcessing.value = false;
  }
}

async function processSingleItem(item: QueueItem, uploadedList: MediaAssetDto[]) {
  try {
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
      revokeItemUrl(item);
      item.previewUrl = processed.dataUrl;
      item.isObjectUrl = false;
    }

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

    item.status = 'uploading';
    item.progress = 50;

    await directUploadToStorage(ticket.uploadUrl, processed.blob, ticket.headers, (percent) => {
      item.progress = 50 + Math.round(percent * 0.35);
    });

    item.status = 'confirming';
    item.progress = 90;

    const cleanExif = Object.keys(processed.exif).length > 0 ? processed.exif : undefined;
    const asset = await apiClient.post<MediaAssetDto>(`/api/v1/media/${ticket.mediaId}/confirm`, {
      width: processed.width,
      height: processed.height,
      thumbKey: ticket.bucketKey,
      exif: cleanExif,
    });
    item.asset = asset;

    if (props.targetEntryId) {
      await apiClient.post('/api/v1/media/bind', {
        entryId: props.targetEntryId,
        mediaId: asset.id,
        role: 'gallery',
      });
    } else if (createTimelineEntry.value) {
      let occurredAt = Date.now();
      if (processed.exif.dateTimeOriginal || processed.exif.dateTime) {
        const rawDate = (processed.exif.dateTimeOriginal || processed.exif.dateTime)!.replace(
          /^(\d{4}):(\d{2}):(\d{2})/,
          '$1-$2-$3'
        );
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
        tags: ['摄影', '影像'],
      });

      await apiClient.post('/api/v1/media/bind', {
        entryId: entry.id,
        mediaId: asset.id,
        role: 'cover',
        sortOrder: 0,
      }).catch(() => {});

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

function directUploadToStorage(
  url: string,
  blob: Blob,
  headers?: Record<string, string>,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (url.includes('mock-signed=true') || url.includes('.internal/')) {
      reject(new Error('对象存储服务未配置（请检查 R2 存储桶或环境变量）'));
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);

    const isSameOriginWorkerBlob = url.startsWith('/api/');
    if (isSameOriginWorkerBlob) {
      xhr.withCredentials = true;
      const token = getStoredToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
    }

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
        reject(new Error(`直传失败 (${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error('网络错误：无法连接对象存储'));
    xhr.send(blob);
  });
}

onUnmounted(() => {
  for (const item of queue.value) {
    revokeItemUrl(item);
  }
});
</script>
