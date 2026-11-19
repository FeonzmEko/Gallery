<template>
  <!-- BENTO EXHIBITION MODE (Demo B Layout + Demo A Paper Palette) -->
  <article
    v-if="layout === 'bento'"
    class="group rounded-2xl border border-[#E5E1D8] bg-white overflow-hidden shadow-xs transition-all duration-200 hover:border-[#BDB6A4] hover:shadow-md hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between"
    @click="$emit('select', entry)"
  >
    <!-- Featured Image Frame if coverUrl exists -->
    <div
      v-if="entry.coverUrl"
      class="relative w-full bg-[#EFECE4] overflow-hidden border-b border-[#E5E1D8]"
      :class="featured ? 'h-64 sm:h-72' : 'h-52'"
    >
      <img
        :src="entry.coverThumbUrl || entry.coverUrl"
        :alt="entry.title"
        loading="lazy"
        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <!-- Translucent Optical HUD on Hover -->
      <div
        class="absolute inset-x-3 bottom-3 rounded-lg bg-[#1D1C1A]/80 backdrop-blur-md px-3 py-1.5 text-[11px] font-mono text-[#F7F5F0] flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      >
        <span class="truncate">{{ typeTheme.code }} · {{ formattedDate }}</span>
        <span v-if="entry.tags?.length" class="text-[#E58D76] shrink-0 ml-2">#{{ entry.tags[0] }}</span>
      </div>
    </div>

    <!-- Card Body -->
    <div class="p-5 sm:p-6 flex-1 flex flex-col justify-between gap-4">
      <div class="space-y-2.5">
        <!-- Top Meta Row -->
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2 font-mono text-[11px] text-[#747169]">
            <span class="text-[#1D1C1A] font-medium">{{ formattedDate }}</span>
            <span class="text-[#D4CEBF]">&middot;</span>
            <span
              class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium border"
              :class="typeTheme.badgeClass"
            >
              <component :is="typeTheme.icon" class="w-3 h-3" />
              <span>{{ typeTheme.label }}</span>
            </span>
          </div>

          <div class="flex items-center gap-1.5">
            <span
              v-if="entry.visibility === 'private'"
              class="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-mono text-amber-800"
            >
              <LockIcon class="w-2.5 h-2.5" />
              <span>私密</span>
            </span>
            <span
              v-else-if="entry.status === 'draft'"
              class="rounded-md bg-[#EFECE4] border border-[#E5E1D8] px-1.5 py-0.5 text-[10px] font-mono text-[#747169]"
            >
              草稿
            </span>
            <div
              v-if="isAdmin"
              class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              @click.stop
            >
              <button
                type="button"
                class="rounded-md p-1 text-[#747169] hover:text-[#C25438] hover:bg-[#F7F5F0] transition-colors"
                @click="$emit('edit', entry)"
                title="编辑条目"
              >
                <PencilIcon class="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                class="rounded-md p-1 text-[#747169] hover:text-red-600 hover:bg-red-50 transition-colors"
                @click="$emit('delete', entry.id)"
                title="删除条目"
              >
                <TrashIcon class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <!-- Title -->
        <h3
          class="font-serif font-medium tracking-tight text-[#1D1C1A] group-hover:text-[#C25438] transition-colors leading-snug"
          :class="featured ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'"
        >
          {{ entry.title }}
        </h3>

        <!-- Summary -->
        <p
          v-if="entry.summary"
          class="text-sm text-[#747169] leading-relaxed"
          :class="entry.coverUrl ? 'line-clamp-2' : 'line-clamp-4'"
        >
          {{ entry.summary }}
        </p>
      </div>

      <!-- Footer: Tags & Open Prompt -->
      <div class="pt-3 border-t border-[#F0ECE1] flex items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-1.5 min-w-0">
          <button
            v-for="tag in (entry.tags || []).slice(0, 3)"
            :key="tag"
            type="button"
            class="inline-flex items-center gap-1 rounded-md bg-[#F7F5F0] hover:bg-[#EFECE4] px-2 py-0.5 text-[10px] font-mono text-[#747169] border border-[#E5E1D8] transition-colors"
            @click.stop="$emit('tag-click', tag)"
          >
            <span>#{{ tag }}</span>
          </button>
        </div>
        <span class="text-[11px] font-mono text-[#9E9B93] group-hover:text-[#C25438] transition-colors shrink-0">
          展开卷宗 &rarr;
        </span>
      </div>
    </div>
  </article>

  <!-- CHRONICLE SPINE MODE (Demo A Editorial Timeline) -->
  <div v-else class="relative group">
    <div
      class="absolute -left-[31px] sm:-left-[39px] top-6 flex h-4 w-4 items-center justify-center rounded-full bg-[#F7F5F0] border-2 shadow-xs transition-transform group-hover:scale-125 z-10"
      :class="typeTheme.borderColor"
    >
      <div class="h-1.5 w-1.5 rounded-full" :class="typeTheme.dotColor"></div>
    </div>

    <article
      class="rounded-2xl border border-[#E5E1D8] bg-white p-5 sm:p-6 shadow-xs transition-all duration-200 hover:border-[#BDB6A4] hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
      @click="$emit('select', entry)"
    >
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0ECE1] pb-3 mb-4">
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1.5 rounded-lg bg-[#F7F5F0] px-2.5 py-1 text-xs font-mono font-medium text-[#747169] border border-[#E5E1D8]">
            <CalendarIcon class="w-3.5 h-3.5 text-[#C25438]" />
            <span>{{ formattedDate }}</span>
          </span>
          <span
            class="inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-xs font-medium border"
            :class="typeTheme.badgeClass"
          >
            <component :is="typeTheme.icon" class="w-3 h-3" />
            <span>{{ typeTheme.label }}</span>
          </span>
        </div>

        <div class="flex items-center gap-2">
          <span
            v-if="entry.visibility === 'private'"
            class="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-mono text-amber-800"
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

          <div v-if="isAdmin" class="flex items-center gap-1 ml-1 opacity-70 group-hover:opacity-100 transition-opacity" @click.stop>
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

      <div class="flex flex-col-reverse sm:flex-row gap-5">
        <div class="flex-1 space-y-2.5">
          <h3 class="font-serif text-lg sm:text-xl font-medium tracking-tight text-[#1D1C1A] group-hover:text-[#C25438] transition-colors leading-snug">
            {{ entry.title }}
          </h3>
          <p v-if="entry.summary" class="text-sm text-[#747169] leading-relaxed line-clamp-3 sm:line-clamp-4">
            {{ entry.summary }}
          </p>
          <div v-if="entry.tags && entry.tags.length > 0" class="flex flex-wrap items-center gap-1.5 pt-2">
            <button
              v-for="tag in entry.tags"
              :key="tag"
              type="button"
              class="inline-flex items-center gap-1 rounded-md bg-[#F7F5F0] hover:bg-[#EFECE4] px-2 py-0.5 text-[11px] font-mono text-[#747169] border border-[#E5E1D8] transition-colors"
              @click.stop="$emit('tag-click', tag)"
            >
              <TagIcon class="w-3 h-3 text-[#9E9B93]" />
              <span>{{ tag }}</span>
            </button>
          </div>
        </div>

        <div
          v-if="entry.coverUrl"
          class="sm:w-48 sm:h-32 w-full h-44 flex-shrink-0 overflow-hidden rounded-xl border border-[#E5E1D8] bg-[#EFECE4]"
        >
          <img
            :src="entry.coverThumbUrl || entry.coverUrl"
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

const props = withDefaults(
  defineProps<{
    entry: EntryDto;
    isAdmin: boolean;
    layout?: 'bento' | 'spine';
    featured?: boolean;
  }>(),
  {
    layout: 'bento',
    featured: false,
  }
);

defineEmits<{
  (e: 'select', entry: EntryDto): void;
  (e: 'edit', entry: EntryDto): void;
  (e: 'delete', id: string): void;
  (e: 'tag-click', tag: string): void;
}>();

const formattedDate = computed(() => formatDate(props.entry.occurredAt, '.'));

interface TypeTheme {
  label: string;
  code: string;
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
        code: 'EXPEDITION',
        badgeClass: 'bg-[#4E6053]/10 text-[#4E6053] border-[#4E6053]/25',
        icon: CompassIcon,
        dotColor: 'bg-[#4E6053]',
        borderColor: 'border-[#4E6053]',
      };
    case 'journal':
      return {
        label: '随想手札',
        code: 'FIELD NOTE',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        icon: BookOpenIcon,
        dotColor: 'bg-amber-700',
        borderColor: 'border-amber-700',
      };
    case 'photo':
      return {
        label: '摄影胶片',
        code: 'PLATE',
        badgeClass: 'bg-[#FDF8F6] text-[#C25438] border-[#F0D5CD]',
        icon: CameraIcon,
        dotColor: 'bg-[#C25438]',
        borderColor: 'border-[#C25438]',
      };
    default:
      return {
        label: '记忆时光',
        code: 'ARCHIVE',
        badgeClass: 'bg-[#EFECE4] text-[#747169] border-[#E5E1D8]',
        icon: ClockIcon,
        dotColor: 'bg-[#747169]',
        borderColor: 'border-[#747169]',
      };
  }
});
</script>
