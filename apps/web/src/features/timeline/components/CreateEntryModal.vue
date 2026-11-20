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
        class="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-[2px] border border-[#DDD6C9] bg-[#F3EFE7] shadow-2xl overflow-hidden"
      >
        <div class="flex items-center justify-between border-b border-[#DDD6C9] px-6 py-4 bg-[#FAF8F4]">
          <div class="space-y-0.5">
            <span class="kicker-caps text-[#9A3F2B] block">CHRONICLE RECORD</span>
            <h3 class="font-serif text-lg font-normal text-[#161513]">
              {{ editingEntry ? '编辑记忆条目' : '记录此刻时光' }}
            </h3>
          </div>
          <button
            type="button"
            class="p-1.5 text-[#787268] hover:text-[#161513] transition-colors"
            @click="handleClose"
          >
            <XIcon class="w-5 h-5" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          <div>
            <label class="block kicker-caps text-[#787268] mb-1.5">标题 *</label>
            <input
              v-model="form.title"
              type="text"
              required
              placeholder="例如：京都红叶漫步 / 岁末独白"
              class="w-full editorial-field px-3.5 py-2.5 text-sm"
            />
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block kicker-caps text-[#787268] mb-1.5">类型</label>
              <select v-model="form.type" class="w-full editorial-field px-3 py-2">
                <option value="journal">随想手札</option>
                <option value="trip">旅行足迹</option>
                <option value="photo">摄影胶片</option>
              </select>
            </div>

            <div>
              <label class="block kicker-caps text-[#787268] mb-1.5">可见权限</label>
              <select v-model="form.visibility" class="w-full editorial-field px-3 py-2">
                <option value="public">公开只读</option>
                <option value="private">私密隐藏</option>
              </select>
            </div>

            <div>
              <label class="block kicker-caps text-[#787268] mb-1.5">发布状态</label>
              <select v-model="form.status" class="w-full editorial-field px-3 py-2">
                <option value="published">已发布</option>
                <option value="draft">草稿</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block kicker-caps text-[#787268] mb-1.5">发生时间 (OCCURRED AT) *</label>
            <input
              v-model="occurredAtDateStr"
              type="datetime-local"
              required
              class="w-full editorial-field px-3 py-2 font-mono"
            />
          </div>

          <!-- Optional Cover Photo Picker from Media Library -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="block kicker-caps text-[#787268]">关联封面影像 (可选)</label>
              <button
                v-if="form.coverMediaId"
                type="button"
                class="text-[11px] font-mono text-[#9A3F2B] hover:underline"
                @click="form.coverMediaId = null"
              >
                清除封面
              </button>
            </div>
            <div v-if="mediaChoices.length > 0" class="flex gap-2 overflow-x-auto pb-1">
              <button
                v-for="asset in mediaChoices"
                :key="asset.id"
                type="button"
                class="relative h-14 w-14 shrink-0 rounded-[2px] overflow-hidden border transition-all p-0.5 bg-[#FAF8F4]"
                :class="
                  form.coverMediaId === asset.id
                    ? 'border-[#9A3F2B] ring-1 ring-[#9A3F2B]'
                    : 'border-[#DDD6C9] opacity-75 hover:opacity-100'
                "
                @click="form.coverMediaId = asset.id"
                :title="asset.originalFilename || asset.id"
              >
                <img :src="asset.thumbUrl || asset.originalUrl" class="h-full w-full object-cover" />
              </button>
            </div>
            <p v-else class="text-[11px] font-serif text-[#9B9488]">
              可先在「影像长廊」上传照片，再于此处选择关联封面。
            </p>
          </div>

          <div>
            <label class="block kicker-caps text-[#787268] mb-1.5">内容摘要</label>
            <textarea
              v-model="form.summary"
              rows="3"
              placeholder="简述这一刻的记忆或发生的事情..."
              class="w-full editorial-field px-3.5 py-2"
            ></textarea>
          </div>

          <div>
            <label class="block kicker-caps text-[#787268] mb-1.5">标签 (以逗号分隔)</label>
            <input
              v-model="tagsInput"
              type="text"
              placeholder="例如：旅行, 京都, 摄影"
              class="w-full editorial-field px-3.5 py-2"
            />
          </div>

          <p v-if="errorMsg" class="text-xs text-[#9A3F2B] font-medium">
            {{ errorMsg }}
          </p>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-[#DDD6C9]">
            <button
              type="button"
              class="px-4 py-2 font-serif tracking-wider text-[#787268] hover:text-[#161513] transition-colors"
              @click="handleClose"
            >
              取消
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="inline-flex items-center gap-2 px-6 py-2.5 rounded-[2px] bg-[#161513] text-[#FAF8F4] font-serif tracking-[0.14em] hover:bg-[#9A3F2B] transition-colors disabled:opacity-50"
            >
              <Loader2Icon v-if="isSubmitting" class="w-3.5 h-3.5 animate-spin" />
              <span>{{ editingEntry ? '保存修改' : '确认归档' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { X as XIcon, Loader2 as Loader2Icon } from 'lucide-vue-next';
import { apiClient } from '@/shared/api/client';
import { useUiStore } from '@/shared/stores/ui.store';
import type { EntryDto, EntryType, Visibility, EntryStatus, MediaAssetDto } from '@archive/contracts';

const props = defineProps<{
  modelValue: boolean;
  editingEntry?: EntryDto | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'saved', entry: EntryDto): void;
}>();

const uiStore = useUiStore();

const isSubmitting = ref(false);
const errorMsg = ref('');
const tagsInput = ref('');
const occurredAtDateStr = ref('');
const mediaChoices = ref<MediaAssetDto[]>([]);

const form = ref<{
  title: string;
  type: EntryType;
  summary: string;
  visibility: Visibility;
  status: EntryStatus;
  coverMediaId: string | null;
}>({
  title: '',
  type: 'journal',
  summary: '',
  visibility: 'public',
  status: 'published',
  coverMediaId: null,
});

function toLocalDatetimeInput(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function loadMediaChoices() {
  try {
    const res = await apiClient.getPaginated<MediaAssetDto>('/api/v1/media', {
      params: { mediaType: 'image', limit: 20 },
    });
    mediaChoices.value = res.items;
  } catch {
    mediaChoices.value = [];
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      errorMsg.value = '';
      loadMediaChoices();
      if (props.editingEntry) {
        form.value = {
          title: props.editingEntry.title,
          type: props.editingEntry.type,
          summary: props.editingEntry.summary || '',
          visibility: props.editingEntry.visibility,
          status: props.editingEntry.status,
          coverMediaId: props.editingEntry.coverMediaId ?? null,
        };
        occurredAtDateStr.value = toLocalDatetimeInput(props.editingEntry.occurredAt);
        tagsInput.value = (props.editingEntry.tags || []).join(', ');
      } else {
        form.value = {
          title: '',
          type: 'journal',
          summary: '',
          visibility: 'public',
          status: 'published',
          coverMediaId: null,
        };
        occurredAtDateStr.value = toLocalDatetimeInput(Date.now());
        tagsInput.value = '';
      }
    }
  }
);

function handleClose() {
  emit('update:modelValue', false);
}

async function handleSubmit() {
  if (!form.value.title.trim()) {
    errorMsg.value = '请输入条目标题';
    return;
  }

  const occurredAt = new Date(occurredAtDateStr.value).getTime();
  if (isNaN(occurredAt) || occurredAt <= 0) {
    errorMsg.value = '请选择合法的发生时间';
    return;
  }

  const tags = tagsInput.value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  isSubmitting.value = true;
  errorMsg.value = '';

  try {
    let saved: EntryDto;
    if (props.editingEntry) {
      saved = await apiClient.put<EntryDto>(`/api/v1/entries/${props.editingEntry.id}`, {
        title: form.value.title.trim(),
        type: form.value.type,
        summary: form.value.summary.trim() || null,
        coverMediaId: form.value.coverMediaId,
        occurredAt,
        visibility: form.value.visibility,
        status: form.value.status,
        tags,
      });
      uiStore.notifySuccess('记忆条目已更新');
    } else {
      saved = await apiClient.post<EntryDto>('/api/v1/entries', {
        title: form.value.title.trim(),
        type: form.value.type,
        summary: form.value.summary.trim() || null,
        coverMediaId: form.value.coverMediaId,
        occurredAt,
        visibility: form.value.visibility,
        status: form.value.status,
        tags,
      });
      uiStore.notifySuccess('已归档至时光编年');
    }

    emit('saved', saved);
    handleClose();
  } catch (err: any) {
    errorMsg.value = err.message || '保存条目失败';
  } finally {
    isSubmitting.value = false;
  }
}
</script>
