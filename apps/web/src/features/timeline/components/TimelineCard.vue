<template>
  <div class="relative group">
    <!-- Timeline Dot / Node on the Left Axis -->
    <div
      class="absolute -left-[31px] sm:-left-[39px] top-6 flex h-4 w-4 items-center justify-center rounded-full bg-[#F7F5F0] border-2 shadow-sm transition-transform group-hover:scale-125 z-10"
      :class="nodeBorderClass"
    >
      <div class="h-1.5 w-1.5 rounded-full" :class="nodeDotClass"></div>
    </div>

    <!-- Card Body -->
    <article
      class="rounded-2xl border border-[#E5E1D8] bg-white p-5 sm:p-6 shadow-sm transition-all duration-200 hover:border-[#D4CEBF] hover:shadow-md hover:-translate-y-0.5"
    >
      <!-- Top Row: Date Badge, Type, Status & Admin Actions -->
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0ECE1] pb-3 mb-4">
        <!-- Occurred At Date Badge -->
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1.5 rounded-lg bg-[#F7F5F0] px-2.5 py-1 text-xs font-mono font-medium text-[#747169] border border-[#E5E1D8]">
            <CalendarIcon class="w-3.5 h-3.5 text-[#C25438]" />
            <span>{{ formattedDate }}</span>
          </span>

          <!-- Entry Type Pill -->
          <span
            class="inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-xs font-medium border"
            :class="typeTheme.badgeClass"
          >
            <component :is="typeTheme.icon" class="w-3 h-3" />
            <span>{{ typeTheme.label }}</span>
          </span>
        </div>

        <!-- Right Side: Visibility & Admin Controls -->
        <div class="flex items-center gap-2">
          <!-- Visibility Badge -->
          <span
            v-if="entry.visibility === 'private'"
            class="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-mono text-amber-800"
            title="私密内容，仅管理员可见"
          >
            <LockIcon class="w-3 h-3" />
            <span>私密</span>
          </span>

          <span
            v-else-if="entry.status === 'draft'"
            class="inline-flex items-center gap-1 rounded-md bg-[#EFECE4] border border-[#E5E1D8] px-2 py-0.5 text-[10px] font-mono text-[#747169]"
          >
            草稿
          </span>

          <!-- Admin Edit / Delete Actions -->
          <div v-if="isAdmin" class="flex items-center gap-1 ml-1 opacity-70 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              class="rounded-md p-1.5 text-[#747169] hover:text-[#C25438] hover:bg-[#F7F5F0] transition-colors"
              @click="$emit('edit', entry)"
              title="编辑条目"
            >
              <PencilIcon class="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              class="rounded-md p-1.5 text-[#747169] hover:text-red-600 hover:bg-red-50 transition-colors"
              @click="$emit('delete', entry.id)"
              title="删除条目"
            >
              <TrashIcon class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <!-- Main Content Layout (Left Text, Right Cover Image) -->
      <div class="flex flex-col-reverse sm:flex-row gap-5">
        <div class="flex-1 space-y-2.5">
          <!-- Title -->
          <h3 class="font-serif text-lg sm:text-xl font-medium tracking-tight text-[#1D1C1A] group-hover:text-[#C25438] transition-colors leading-snug">
            {{ entry.title }}
          </h3>

          <!-- Summary / Content -->
          <p
            v-if="entry.summary"
            class="text-sm text-[#747169] leading-relaxed line-clamp-3 sm:line-clamp-4 font-normal"
          >
            {{ entry.summary }}
          </p>

          <!-- Tags List -->
          <div v-if="entry.tags && entry.tags.length > 0" class="flex flex-wrap items-center gap-1.5 pt-2">
            <span
              v-for="tag in entry.tags"
              :key="tag"
              class="inline-flex items-center gap-1 rounded-md bg-[#F7F5F0] px-2 py-0.5 text-[11px] font-mono text-[#747169] border border-[#E5E1D8]"
            >
              <TagIcon class="w-3 h-3 text-[#9E9B93]" />
              <span>{{ tag }}</span>
            </span>
          </div>
        </div>

        <!-- Cover Image Preview (if present) -->
        <div
          v-if="entry.coverUrl || entry.coverMediaId"
          class="sm:w-48 sm:h-32 w-full h-44 flex-shrink-0 overflow-hidden rounded-xl border border-[#E5E1D8] bg-[#EFECE4] relative"
        >
          <img
            :src="entry.coverUrl || `https://picsum.photos/seed/${entry.id}/400/300`"
            :alt="entry.title"
            loading="lazy"
            class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  Calendar as CalendarIcon,
  Tag as TagIcon,
  Lock as LockIcon,
  Pencil as PencilIcon,
  Trash as TrashIcon,
  Compass as CompassIcon,
  BookOpen as BookOpenIcon,
  Camera as CameraIcon,
  Clock as ClockIcon,
} from 'lucide-vue-next';
import type { EntryDto } from '@archive/contracts';
import { formatDate } from '@archive/shared';

const props = defineProps<{
  entry: EntryDto;
  isAdmin: boolean;
}>();

defineEmits<{
  (e: 'edit', entry: EntryDto): void;
  (e: 'delete', id: string): void;
}>();

const formattedDate = computed(() => {
  return formatDate(props.entry.occurredAt, '.');
});

interface TypeTheme {
  label: string;
  badgeClass: string;
  icon: any;
  dotColor: string;
  borderColor: string;
}

const typeTheme = computed<TypeTheme>(() => {
  switch (props.entry.type) {
    case 'trip':
      return {
        label: '旅行足迹',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        icon: CompassIcon,
        dotColor: 'bg-emerald-600',
        borderColor: 'border-emerald-600',
      };
    case 'journal':
      return {
        label: '随想手札',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        icon: BookOpenIcon,
        dotColor: 'bg-amber-600',
        borderColor: 'border-amber-600',
      };
    case 'photo':
      return {
        label: '摄影长廊',
        badgeClass: 'bg-[#FDF8F6] text-[#C25438] border-[#F0D5CD]',
        icon: CameraIcon,
        dotColor: 'bg-[#C25438]',
        borderColor: 'border-[#C25438]',
      };
    default:
      return {
        label: '记忆时光',
        badgeClass: 'bg-[#EFECE4] text-[#747169] border-[#E5E1D8]',
        icon: ClockIcon,
        dotColor: 'bg-[#747169]',
        borderColor: 'border-[#747169]',
      };
  }
});

const nodeBorderClass = computed(() => typeTheme.value.borderColor);
const nodeDotClass = computed(() => typeTheme.value.dotColor);
</script>
