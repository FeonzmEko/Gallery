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

    <!-- Modal Box -->
    <div
      class="relative w-full max-w-lg rounded-2xl border border-[#E5E1D8] bg-[#F7F5F0] shadow-2xl overflow-hidden"
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-[#E5E1D8] px-6 py-4 bg-white">
        <h3 class="font-serif text-lg font-medium text-[#1D1C1A] flex items-center gap-2">
          <ClockIcon class="w-4 h-4 text-[#C25438]" />
          <span>{{ editingEntry ? '编辑记忆条目' : '记录此刻美好' }}</span>
        </h3>
        <button
          type="button"
          class="rounded-lg p-1.5 text-[#747169] hover:text-[#1D1C1A] hover:bg-[#EFECE4] transition-colors"
          @click="handleClose"
        >
          <XIcon class="w-5 h-5" />
        </button>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
        <!-- Title Input -->
        <div>
          <label class="block text-xs font-medium text-[#1D1C1A] mb-1.5">标题 *</label>
          <input
            v-model="form.title"
            type="text"
            required
            placeholder="例如：京都红叶漫步 / 个人架构升级日记"
            class="w-full rounded-xl bg-white border border-[#E5E1D8] px-3.5 py-2 text-sm text-[#1D1C1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#C25438]/60 focus:ring-1 focus:ring-[#C25438]/30 transition-colors shadow-xs"
          />
        </div>

        <!-- Type & Visibility -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-[#1D1C1A] mb-1.5">类型</label>
            <select
              v-model="form.type"
              class="w-full rounded-xl bg-white border border-[#E5E1D8] px-3 py-2 text-xs text-[#1D1C1A] focus:outline-none focus:border-[#C25438]/60 transition-colors shadow-xs"
            >
              <option value="journal">随想手札 (journal)</option>
              <option value="trip">旅行足迹 (trip)</option>
              <option value="photo">摄影切片 (photo)</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-[#1D1C1A] mb-1.5">公开权限</label>
            <select
              v-model="form.visibility"
              class="w-full rounded-xl bg-white border border-[#E5E1D8] px-3 py-2 text-xs text-[#1D1C1A] focus:outline-none focus:border-[#C25438]/60 transition-colors shadow-xs"
            >
              <option value="public">公开只读 (Public)</option>
              <option value="private">私密隐藏 (Private)</option>
            </select>
          </div>
        </div>

        <!-- Occurred At (Date input) -->
        <div>
          <label class="block text-xs font-medium text-[#1D1C1A] mb-1.5">
            发生时间 (occurred_at) *
          </label>
          <input
            v-model="occurredAtDateStr"
            type="datetime-local"
            required
            class="w-full rounded-xl bg-white border border-[#E5E1D8] px-3 py-2 text-xs text-[#1D1C1A] focus:outline-none focus:border-[#C25438]/60 transition-colors shadow-xs font-mono"
          />
        </div>

        <!-- Summary -->
        <div>
          <label class="block text-xs font-medium text-[#1D1C1A] mb-1.5">内容摘要</label>
          <textarea
            v-model="form.summary"
            rows="3"
            placeholder="简述这一刻的记忆或发生的事情..."
            class="w-full rounded-xl bg-white border border-[#E5E1D8] px-3.5 py-2 text-xs text-[#1D1C1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#C25438]/60 focus:ring-1 focus:ring-[#C25438]/30 transition-colors shadow-xs"
          ></textarea>
        </div>

        <!-- Tags -->
        <div>
          <label class="block text-xs font-medium text-[#1D1C1A] mb-1.5">标签 (以逗号分隔)</label>
          <input
            v-model="tagsInput"
            type="text"
            placeholder="例如：旅行, 日本, 摄影"
            class="w-full rounded-xl bg-white border border-[#E5E1D8] px-3.5 py-2 text-xs text-[#1D1C1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#C25438]/60 transition-colors shadow-xs"
          />
        </div>

        <!-- Error Msg -->
        <p v-if="errorMsg" class="text-xs text-red-600 font-medium">
          {{ errorMsg }}
        </p>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E1D8]">
          <button
            type="button"
            class="px-4 py-2 rounded-xl text-xs font-medium text-[#747169] hover:text-[#1D1C1A] hover:bg-[#EFECE4] transition-colors"
            @click="handleClose"
          >
            取消
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#C25438] text-xs font-medium text-white hover:bg-[#A9442C] shadow-sm transition-all disabled:opacity-50"
          >
            <Loader2Icon v-if="isSubmitting" class="w-3.5 h-3.5 animate-spin" />
            <span>{{ editingEntry ? '保存修改' : '确认记录' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { X as XIcon, Clock as ClockIcon, Loader2 as Loader2Icon } from 'lucide-vue-next';
import { apiClient } from '@/shared/api/client';
import type { EntryDto, EntryType, Visibility } from '@archive/contracts';

const props = defineProps<{
  modelValue: boolean;
  editingEntry?: EntryDto | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'saved', entry: EntryDto): void;
}>();

const isSubmitting = ref(false);
const errorMsg = ref('');
const tagsInput = ref('');
const occurredAtDateStr = ref('');

const form = ref<{
  title: string;
  type: EntryType;
  summary: string;
  visibility: Visibility;
}>({
  title: '',
  type: 'journal',
  summary: '',
  visibility: 'public',
});

function toLocalDatetimeInput(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      errorMsg.value = '';
      if (props.editingEntry) {
        form.value = {
          title: props.editingEntry.title,
          type: props.editingEntry.type,
          summary: props.editingEntry.summary || '',
          visibility: props.editingEntry.visibility,
        };
        occurredAtDateStr.value = toLocalDatetimeInput(props.editingEntry.occurredAt);
        tagsInput.value = (props.editingEntry.tags || []).join(', ');
      } else {
        form.value = {
          title: '',
          type: 'journal',
          summary: '',
          visibility: 'public',
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
        occurredAt,
        visibility: form.value.visibility,
        tags,
      });
    } else {
      saved = await apiClient.post<EntryDto>('/api/v1/entries', {
        title: form.value.title.trim(),
        type: form.value.type,
        summary: form.value.summary.trim() || null,
        occurredAt,
        visibility: form.value.visibility,
        status: 'published',
        tags,
      });
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
