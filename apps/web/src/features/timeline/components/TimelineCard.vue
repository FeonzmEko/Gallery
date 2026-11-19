<template>
  <div class="relative group">
    <!-- Timeline Dot / Node on the Left Axis -->
    <div
      class="absolute -left-[31px] sm:-left-[39px] top-6 flex h-4 w-4 items-center justify-center rounded-full bg-slate-950 border-2 shadow transition-transform group-hover:scale-125"
      :class="nodeBorderClass"
    >
      <div class="h-1.5 w-1.5 rounded-full" :class="nodeDotClass"></div>
    </div>

    <!-- Card Body -->
    <article
      class="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 sm:p-6 backdrop-blur-sm transition-all duration-200 hover:border-slate-700 hover:bg-slate-900/80 hover:shadow-xl hover:shadow-sky-500/5"
    >
      <!-- Top Row: Date Badge, Type, Status & Admin Actions -->
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-3 mb-4">
        <!-- Occurred At Date Badge -->
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1.5 rounded-xl bg-slate-800/80 px-2.5 py-1 text-xs font-mono font-medium text-slate-300 border border-slate-700/60 shadow-sm">
            <CalendarIcon class="w-3.5 h-3.5 text-sky-400" />
            <span>{{ formattedDate }}</span>
          </span>

          <!-- Entry Type Pill -->
          <span
            class="inline-flex items-center gap-1 rounded-xl px-2.5 py-0.5 text-xs font-medium border"
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
            class="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono text-amber-400"
            title="私密内容，仅管理员可见"
          >
            <LockIcon class="w-3 h-3" />
            <span>私密</span>
          </span>

          <span
            v-else-if="entry.status === 'draft'"
            class="inline-flex items-center gap-1 rounded-lg bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-mono text-slate-400"
          >
            草稿
          </span>

          <!-- Admin Edit / Delete Actions -->
          <div v-if="isAdmin" class="flex items-center gap-1 ml-1 opacity-80 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              class="rounded-lg p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition-colors"
              @click="$emit('edit', entry)"
              title="编辑条目"
            >
              <PencilIcon class="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              class="rounded-lg p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
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
          <h3 class="text-lg sm:text-xl font-bold tracking-tight text-white group-hover:text-sky-300 transition-colors">
            {{ entry.title }}
          </h3>

          <!-- Summary / Content -->
          <p
            v-if="entry.summary"
            class="text-sm text-slate-300 leading-relaxed line-clamp-3 sm:line-clamp-4 font-normal"
          >
            {{ entry.summary }}
          </p>

          <!-- Tags List -->
          <div v-if="entry.tags && entry.tags.length > 0" class="flex flex-wrap items-center gap-1.5 pt-2">
            <span
              v-for="tag in entry.tags"
              :key="tag"
              class="inline-flex items-center gap-1 rounded-lg bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium text-slate-400 border border-slate-700/50"
            >
              <TagIcon class="w-3 h-3 text-slate-500" />
              <span>{{ tag }}</span>
            </span>
          </div>
        </div>

        <!-- Cover Image Preview (if present) -->
        <div
          v-if="entry.coverUrl || entry.coverMediaId"
          class="sm:w-48 sm:h-32 w-full h-44 flex-shrink-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 relative"
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
        badgeClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
        icon: CompassIcon,
        dotColor: 'bg-indigo-400',
        borderColor: 'border-indigo-400',
      };
    case 'journal':
      return {
        label: '随想日记',
        badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        icon: BookOpenIcon,
        dotColor: 'bg-amber-400',
        borderColor: 'border-amber-400',
      };
    case 'photo':
      return {
        label: '摄影长廊',
        badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        icon: CameraIcon,
        dotColor: 'bg-emerald-400',
        borderColor: 'border-emerald-400',
      };
    default:
      return {
        label: '记忆时光',
        badgeClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
        icon: ClockIcon,
        dotColor: 'bg-sky-400',
        borderColor: 'border-sky-400',
      };
  }
});

const nodeBorderClass = computed(() => typeTheme.value.borderColor);
const nodeDotClass = computed(() => typeTheme.value.dotColor);
</script>
