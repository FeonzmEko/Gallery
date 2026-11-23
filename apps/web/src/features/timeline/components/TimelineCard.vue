<template>
  <!-- ========================================================= -->
  <!-- MODE 1: LEAD EDITORIAL SPREAD (Full-width Opening Plate)  -->
  <!-- ========================================================= -->
  <article
    v-if="layout === 'lead'"
    class="group museum-plate rounded-[2px] overflow-hidden cursor-pointer grid grid-cols-1 lg:grid-cols-12"
    @click="$emit('select', entry)"
  >
    <!-- Left: Passe-Partout Framed Artwork -->
    <div
      v-if="entry.coverUrl"
      class="lg:col-span-7 bg-[#EAE4D8]/60 p-4 sm:p-6 lg:p-8 flex items-center justify-center border-b lg:border-b-0 lg:border-r border-[#DDD6C9] relative overflow-hidden"
    >
      <div class="relative w-full aspect-[16/10] bg-[#161513]/5 overflow-hidden passe-partout p-2 sm:p-2.5">
        <div class="relative w-full h-full overflow-hidden bg-[#EAE4D8]">
          <img
            :src="entry.coverThumbUrl || entry.coverUrl"
            :alt="entry.title"
            loading="lazy"
            class="h-full w-full object-cover transition-transform duration-700 ease-gallery group-hover:scale-[1.035]"
          />
          <!-- Discreet Darkroom Plate Strip on Hover -->
          <div
            class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#11100F]/85 via-[#11100F]/40 to-transparent px-4 pt-8 pb-3 text-[10px] font-mono tracking-[0.16em] uppercase text-[#FAF8F4]/90 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          >
            <span>{{ typeTheme.code }} · {{ formattedDate }}</span>
            <span v-if="uniqueTags.length" class="text-[#E2A998]">#{{ uniqueTags[0] }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Right: Museum Wall Placard & Editorial Copy -->
    <div
      class="p-7 sm:p-9 lg:p-11 flex flex-col justify-between gap-8"
      :class="entry.coverUrl ? 'lg:col-span-5' : 'lg:col-span-12'"
    >
      <div class="space-y-5">
        <!-- Plate Number + Meta Line -->
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-1.5">
            <div class="flex items-center gap-2.5 kicker-caps">
              <span :class="typeTheme.textColor">{{ typeTheme.code }}</span>
              <span class="text-[#C4BBA9]">/</span>
              <span class="text-[#787268] tabular-nums">{{ formattedDate }}</span>
            </div>
            <div class="flex items-center gap-2 text-[11px] font-serif text-[#787268]">
              <span>{{ typeTheme.label }}</span>
              <span v-if="entry.visibility === 'private'" class="text-[#9A6B2F] font-mono text-[10px] tracking-widest uppercase">
                · PRIVATE
              </span>
              <span v-else-if="entry.status === 'draft'" class="text-[#9B9488] font-mono text-[10px] tracking-widest uppercase">
                · DRAFT
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span v-if="plateIndex" class="font-display italic text-3xl sm:text-4xl font-light text-[#C4BBA9] leading-none select-none tabular-nums">
              {{ plateIndex }}
            </span>
            <div
              v-if="isAdmin"
              class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
              @click.stop
            >
              <button
                type="button"
                class="p-1.5 text-[#787268] hover:text-[#9A3F2B] transition-colors"
                @click="$emit('edit', entry)"
                title="编辑条目"
              >
                <PencilIcon class="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                class="p-1.5 text-[#787268] hover:text-[#9A3F2B] transition-colors"
                @click="$emit('delete', entry.id)"
                title="删除条目"
              >
                <TrashIcon class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div class="h-[1px] w-10 bg-[#9A3F2B]/50"></div>

        <!-- Monumental Title -->
        <h3 class="font-serif text-2xl sm:text-3xl font-normal tracking-[0.01em] text-[#161513] group-hover:text-[#9A3F2B] transition-colors duration-300 leading-[1.35]">
          {{ entry.title }}
        </h3>

        <!-- Excerpt -->
        <p
          v-if="entry.summary"
          class="text-[14px] text-[#57534C] leading-[1.85] line-clamp-4 font-light"
        >
          {{ entry.summary }}
        </p>
      </div>

      <!-- Bottom Colophon -->
      <div class="pt-5 border-t border-[#E8E2D6] flex items-center justify-between gap-4">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
          <button
            v-for="tag in uniqueTags.slice(0, 3)"
            :key="tag"
            type="button"
            class="text-[11px] font-mono tracking-[0.08em] text-[#787268] hover:text-[#9A3F2B] transition-colors"
            @click.stop="$emit('tag-click', tag)"
          >
            #{{ tag }}
          </button>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-2 text-[11px] font-serif tracking-[0.16em] text-[#161513] group-hover:text-[#9A3F2B] transition-colors shrink-0 cursor-pointer"
          @click.stop="$emit('select', entry)"
        >
          <span>展开卷宗</span>
          <span class="font-mono transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
        </button>
      </div>
    </div>
  </article>

  <!-- ========================================================= -->
  <!-- MODE 2: CURATED EXHIBITION PLATE (Bento Gallery Grid)     -->
  <!-- ========================================================= -->
  <article
    v-else-if="layout === 'bento'"
    class="group museum-plate rounded-[2px] overflow-hidden cursor-pointer flex flex-col justify-between"
    @click="$emit('select', entry)"
  >
    <!-- Framed Image Area if coverUrl exists -->
    <div
      v-if="entry.coverUrl"
      class="bg-[#EAE4D8]/45 p-3.5 sm:p-4 border-b border-[#E8E2D6] relative"
    >
      <div
        class="relative w-full overflow-hidden bg-[#EAE4D8]"
        :class="featured ? 'aspect-[16/10]' : 'aspect-[4/3]'"
      >
        <img
          :src="entry.coverThumbUrl || entry.coverUrl"
          :alt="entry.title"
          loading="lazy"
          class="h-full w-full object-cover transition-transform duration-700 ease-gallery group-hover:scale-[1.04]"
        />
        <!-- Darkroom Optical Strip on Hover -->
        <div
          class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#11100F]/85 via-[#11100F]/35 to-transparent px-3.5 pt-7 pb-2.5 text-[10px] font-mono tracking-[0.15em] uppercase text-[#FAF8F4]/90 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >
          <span class="truncate">{{ typeTheme.code }} · {{ formattedDate }}</span>
          <span v-if="uniqueTags.length" class="text-[#E2A998] shrink-0 ml-2">#{{ uniqueTags[0] }}</span>
        </div>
      </div>
    </div>

    <!-- Card Typography & Placard Body -->
    <div class="p-6 sm:p-7 flex-1 flex flex-col justify-between gap-6">
      <div class="space-y-3.5">
        <!-- Top Architectural Meta Row -->
        <div class="flex items-start justify-between gap-3">
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1 kicker-caps">
            <span class="text-[#161513] tabular-nums">{{ formattedDate }}</span>
            <span class="text-[#C4BBA9]">&mdash;</span>
            <span :class="typeTheme.textColor">{{ typeTheme.code }}</span>
            <span v-if="entry.visibility === 'private'" class="text-[#9A6B2F]">· PRIVATE</span>
            <span v-else-if="entry.status === 'draft'" class="text-[#9B9488]">· DRAFT</span>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <span
              v-if="plateIndex"
              class="font-display italic text-xl font-light text-[#C4BBA9] leading-none select-none tabular-nums"
            >
              {{ plateIndex }}
            </span>
            <div
              v-if="isAdmin"
              class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              @click.stop
            >
              <button
                type="button"
                class="p-1 text-[#787268] hover:text-[#9A3F2B] transition-colors"
                @click="$emit('edit', entry)"
                title="编辑条目"
              >
                <PencilIcon class="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                class="p-1 text-[#787268] hover:text-[#9A3F2B] transition-colors"
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
          class="font-serif font-normal tracking-[0.01em] text-[#161513] group-hover:text-[#9A3F2B] transition-colors duration-300 leading-[1.4]"
          :class="featured ? 'text-xl sm:text-2xl' : 'text-lg sm:text-[21px]'"
        >
          {{ entry.title }}
        </h3>

        <!-- Summary -->
        <p
          v-if="entry.summary"
          class="text-[13.5px] text-[#57534C] leading-[1.8] font-light"
          :class="entry.coverUrl ? 'line-clamp-2' : 'line-clamp-4'"
        >
          {{ entry.summary }}
        </p>
      </div>

      <!-- Footer: Minimal Tags & Open Action -->
      <div class="pt-4 border-t border-[#E8E2D6] flex items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1 min-w-0">
          <button
            v-for="tag in uniqueTags.slice(0, 3)"
            :key="tag"
            type="button"
            class="text-[11px] font-mono text-[#57534C] hover:text-[#9A3F2B] transition-colors"
            @click.stop="$emit('tag-click', tag)"
          >
            #{{ tag }}
          </button>
          <span v-if="!uniqueTags.length" class="text-[11px] font-serif text-[#6E685E]">
            {{ typeTheme.label }}
          </span>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 text-[11px] font-serif tracking-[0.14em] text-[#57534C] group-hover:text-[#9A3F2B] transition-colors shrink-0 cursor-pointer"
          @click.stop="$emit('select', entry)"
        >
          <span>阅览</span>
          <span class="font-mono transition-transform duration-300 group-hover:translate-x-0.5">&rarr;</span>
        </button>
      </div>
    </div>
  </article>

  <!-- ========================================================= -->
  <!-- MODE 3: CHRONICLE ANNALS SPINE (Book Ledger View)         -->
  <!-- ========================================================= -->
  <article
    v-else
    class="group grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 py-8 border-b border-[#DDD6C9] cursor-pointer transition-colors hover:bg-[#FAF8F4]/55 -mx-4 px-4"
    @click="$emit('select', entry)"
  >
    <!-- Left Column: Monumental Date & Index -->
    <div class="md:col-span-3 flex md:flex-col justify-between md:justify-start gap-1.5">
      <div class="flex items-baseline gap-2.5">
        <span class="font-display text-3xl sm:text-4xl font-light text-[#161513] leading-none tabular-nums">
          {{ dateParts.monthDay }}
        </span>
        <span class="font-mono text-[11px] text-[#9B9488] tabular-nums">
          {{ dateParts.year }}
        </span>
      </div>
      <div class="flex items-center gap-2 kicker-caps mt-1">
        <span :class="typeTheme.textColor">{{ typeTheme.code }}</span>
        <span v-if="entry.visibility === 'private'" class="text-[#9A6B2F]">· PRIVATE</span>
        <span v-else-if="entry.status === 'draft'" class="text-[#9B9488]">· DRAFT</span>
      </div>
    </div>

    <!-- Middle Column: Title, Summary, Tags -->
    <div
      class="flex flex-col justify-between gap-3"
      :class="entry.coverUrl ? 'md:col-span-6' : 'md:col-span-9'"
    >
      <div class="space-y-2.5">
        <div class="flex items-start justify-between gap-4">
          <h3 class="font-serif text-xl sm:text-2xl font-normal text-[#161513] group-hover:text-[#9A3F2B] transition-colors leading-[1.38]">
            {{ entry.title }}
          </h3>
          <div
            v-if="isAdmin"
            class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            @click.stop
          >
            <button
              type="button"
              class="p-1 text-[#787268] hover:text-[#9A3F2B]"
              @click="$emit('edit', entry)"
              title="编辑条目"
            >
              <PencilIcon class="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              class="p-1 text-[#787268] hover:text-[#9A3F2B]"
              @click="$emit('delete', entry.id)"
              title="删除条目"
            >
              <TrashIcon class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <p v-if="entry.summary" class="text-[13.5px] text-[#57534C] leading-[1.8] line-clamp-3 font-light">
          {{ entry.summary }}
        </p>
      </div>

      <div class="flex items-center justify-between gap-4 pt-2">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
          <button
            v-for="tag in uniqueTags"
            :key="tag"
            type="button"
            class="text-[11px] font-mono text-[#787268] hover:text-[#9A3F2B] transition-colors"
            @click.stop="$emit('tag-click', tag)"
          >
            #{{ tag }}
          </button>
        </div>
        <button
          type="button"
          class="relative z-10 inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap px-3 py-1.5 -my-1.5 -mr-3 rounded-[2px] text-[11px] font-serif tracking-[0.14em] text-[#787268] group-hover:text-[#9A3F2B] hover:bg-[#EAE4D8]/65 transition-colors cursor-pointer"
          @click.stop="$emit('select', entry)"
        >
          <span>展开卷宗</span>
          <span class="font-mono transition-transform duration-300 group-hover:translate-x-0.5">&rarr;</span>
        </button>
      </div>
    </div>

    <!-- Right Column: Framed Thumbnail -->
    <div v-if="entry.coverUrl" class="md:col-span-3 flex items-center">
      <div class="w-full aspect-[4/3] passe-partout p-1.5 overflow-hidden">
        <div class="w-full h-full overflow-hidden bg-[#EAE4D8]">
          <img
            :src="entry.coverThumbUrl || entry.coverUrl"
            :alt="entry.title"
            loading="lazy"
            class="h-full w-full object-cover transition-transform duration-700 ease-gallery group-hover:scale-105"
          />
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  Pencil as PencilIcon,
  Trash as TrashIcon,
} from 'lucide-vue-next';
import type { EntryDto } from '@archive/contracts';
import { formatDate } from '@archive/shared';

const props = withDefaults(
  defineProps<{
    entry: EntryDto;
    isAdmin: boolean;
    layout?: 'lead' | 'bento' | 'spine';
    featured?: boolean;
    index?: number;
  }>(),
  {
    layout: 'bento',
    featured: false,
    index: undefined,
  }
);

defineEmits<{
  (e: 'select', entry: EntryDto): void;
  (e: 'edit', entry: EntryDto): void;
  (e: 'delete', id: string): void;
  (e: 'tag-click', tag: string): void;
}>();

const formattedDate = computed(() => formatDate(props.entry.occurredAt, '.'));

const uniqueTags = computed<string[]>(() => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of props.entry.tags ?? []) {
    const tag = raw.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
  }
  return result;
});

const plateIndex = computed(() => {
  if (props.index === undefined) return '';
  return String(props.index + 1).padStart(2, '0');
});

const dateParts = computed(() => {
  const str = formattedDate.value;
  const parts = str.split('.');
  if (parts.length === 3) {
    return { year: parts[0], monthDay: `${parts[1]}.${parts[2]}` };
  }
  return { year: '', monthDay: str };
});

interface TypeTheme {
  label: string;
  code: string;
  textColor: string;
}

const typeTheme = computed<TypeTheme>(() => {
  switch (props.entry.type) {
    case 'trip':
      return {
        label: '旅行足迹',
        code: 'EXPEDITION',
        textColor: 'text-[#3D4E42]',
      };
    case 'journal':
      return {
        label: '随想手札',
        code: 'CAHIER',
        textColor: 'text-[#7A5B32]',
      };
    case 'photo':
      return {
        label: '摄影胶片',
        code: 'PLATE',
        textColor: 'text-[#9A3F2B]',
      };
    default:
      return {
        label: '记忆时光',
        code: 'ARCHIVE',
        textColor: 'text-[#787268]',
      };
  }
});
</script>
