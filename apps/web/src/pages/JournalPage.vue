<template>
  <div class="gallery-reveal space-y-10 sm:space-y-12">
    <!-- ========================================================= -->
    <!-- LITERARY MONOGRAPH MASTHEAD                               -->
    <!-- ========================================================= -->
    <section class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-end pb-8 border-b border-[#DDD6C9]">
      <div class="lg:col-span-7 space-y-3">
        <div class="flex items-center gap-3 kicker-caps text-[#9A3F2B]">
          <span>CHAPTER III</span>
          <span class="w-6 h-[1px] bg-[#C4BBA9]"></span>
          <span class="text-[#787268]">FIELD NOTES &amp; ESSAYS · MARKDOWN ARCHIVE</span>
        </div>
        <div class="flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <h1 class="font-serif text-4xl sm:text-5xl lg:text-[54px] font-light tracking-[0.04em] text-[#161513] leading-[1.12]">
            随想手札
          </h1>
          <span class="font-display italic text-2xl sm:text-3xl font-light text-[#9B9488] tracking-wide">
            Cahiers &amp; Essais
          </span>
        </div>
      </div>

      <div class="lg:col-span-5 flex flex-col lg:items-end justify-between gap-4">
        <p class="font-serif text-[13.5px] sm:text-sm text-[#57534C] leading-[1.85] lg:text-right max-w-md font-light">
          纸短情长，以克制的纯文本留存彼时心境、天色与思绪的缓慢沉淀。
        </p>

        <div class="flex flex-wrap items-center gap-4">
          <span v-if="isLoading" class="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.14em] text-[#9B9488]">
            <span class="w-1.5 h-1.5 rounded-full bg-[#9A3F2B]/60 animate-pulse"></span>
            <span>检录中…</span>
          </span>
          <span v-else class="font-mono text-[11px] tracking-[0.14em] text-[#787268] tabular-nums">
            {{ journals.length }} 篇手札
          </span>
          <button
            v-if="authStore.isAdmin"
            type="button"
            class="inline-flex items-center gap-2 rounded-[2px] bg-[#161513] px-4 py-2 text-xs font-serif tracking-[0.14em] text-[#FAF8F4] hover:bg-[#9A3F2B] transition-colors duration-200"
            @click="openCreateModal"
          >
            <PenSquareIcon class="w-3.5 h-3.5" />
            <span>撰写手札</span>
          </button>
        </div>
      </div>
    </section>

    <!-- ========================================================= -->
    <!-- MOOD INDEX & SEARCH CONTROL RAIL                          -->
    <!-- ========================================================= -->
    <section class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#DDD6C9]">
      <div class="flex flex-wrap items-center gap-6">
        <button
          type="button"
          class="relative pb-3.5 text-[13px] font-serif tracking-[0.12em] transition-colors shrink-0"
          :class="selectedMood === '' ? 'text-[#161513] font-medium' : 'text-[#57534C] hover:text-[#161513]'"
          @click="selectMood('')"
        >
          <span>全部心境</span>
          <span
            class="absolute -bottom-[1px] inset-x-0 h-[1.5px] bg-[#9A3F2B] transition-transform duration-300 ease-gallery origin-left"
            :class="selectedMood === '' ? 'scale-x-100' : 'scale-x-0'"
          ></span>
        </button>

        <button
          v-for="m in moodOptions"
          :key="m.value"
          type="button"
          class="relative pb-3.5 text-[13px] font-serif tracking-[0.12em] transition-colors shrink-0"
          :class="selectedMood === m.value ? 'text-[#161513] font-medium' : 'text-[#57534C] hover:text-[#161513]'"
          @click="selectMood(m.value)"
        >
          <span>{{ m.label }}</span>
          <span
            class="absolute -bottom-[1px] inset-x-0 h-[1.5px] bg-[#9A3F2B] transition-transform duration-300 ease-gallery origin-left"
            :class="selectedMood === m.value ? 'scale-x-100' : 'scale-x-0'"
          ></span>
        </button>
      </div>

      <div class="relative flex items-center shrink-0 pb-3">
        <SearchIcon class="w-3.5 h-3.5 text-[#6E685E] pointer-events-none mr-2" />
        <input
          v-model="searchKeyword"
          type="text"
          placeholder="检索手札标题或正文..."
          class="w-48 sm:w-56 bg-transparent border-b border-[#C4BBA9] focus:border-[#161513] pb-1 text-xs text-[#161513] placeholder-[#787268] focus:outline-none transition-colors"
          @input="handleSearchDebounced"
        />
      </div>
    </section>

    <!-- ========================================================= -->
    <!-- FOLIO TRANSITION STAGE (Skeleton / Empty / Folio Plates)  -->
    <!-- ========================================================= -->
    <Transition
      mode="out-in"
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <!-- LOADING SKELETON -->
      <div v-if="isLoading" key="loading" class="grid grid-cols-1 md:grid-cols-2 gap-7">
        <div
          v-for="i in 4"
          :key="i"
          class="h-52 bg-[#FAF8F4] border border-[#DDD6C9] p-8 animate-pulse space-y-4"
        >
          <div class="h-3 bg-[#EAE4D8] w-1/3"></div>
          <div class="h-6 bg-[#EAE4D8] w-2/3"></div>
          <div class="h-14 bg-[#EAE4D8]/60 w-full"></div>
        </div>
      </div>

      <!-- SERENE LITERARY EMPTY STATE -->
      <div
        v-else-if="journals.length === 0"
        key="empty"
        class="py-24 sm:py-32 px-6 text-center flex flex-col items-center justify-center border-y border-[#DDD6C9] bg-[#FAF8F4]/40"
      >
      <div class="w-[1px] h-10 bg-[#C4BBA9] mb-6"></div>
      <span class="font-display italic text-3xl text-[#C4BBA9] mb-4">§</span>
      <p class="font-display italic text-lg text-[#9B9488] tracking-wide">
        {{ searchKeyword || selectedMood ? 'No Matching Folios' : 'Unwritten Pages' }}
      </p>
      <h3 class="mt-2 font-serif text-2xl font-light tracking-[0.08em] text-[#161513]">
        {{ searchKeyword || selectedMood ? '未检得契合之手札' : '素纸待墨' }}
      </h3>
      <p class="mt-3 text-xs text-[#787268] max-w-sm leading-[1.9] font-light">
        {{ searchKeyword || selectedMood ? '当前筛选条件下没有找到对应的随笔记录。' : '尚未落笔成篇。记下此刻所思所想、天气与光阴琐碎，便成一卷手札。' }}
      </p>
      <button
        v-if="authStore.isAdmin && !searchKeyword && !selectedMood"
        type="button"
        class="mt-8 inline-flex items-center gap-2 rounded-[2px] bg-[#161513] px-5 py-2.5 text-xs font-serif tracking-[0.16em] text-[#FAF8F4] hover:bg-[#9A3F2B] transition-colors"
        @click="openCreateModal"
      >
        <PenSquareIcon class="w-3.5 h-3.5" />
        <span>落笔首篇手札</span>
      </button>
    </div>

    <!-- LITERARY FOLIO LAYOUT (Lead Essay + 2-Col Folio Plates) -->
    <div v-else key="list" class="space-y-8">
      <!-- Lead Essay Spread -->
      <article
        v-if="journals.length > 0"
        class="group museum-plate rounded-[2px] p-8 sm:p-11 lg:p-14 cursor-pointer grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
        @click="readingJournal = journals[0]"
      >
        <div class="lg:col-span-3 flex lg:flex-col justify-between lg:justify-start gap-4 lg:border-r lg:border-[#E8E2D6] lg:pr-8">
          <span class="font-display italic text-5xl sm:text-6xl font-light text-[#C4BBA9] leading-none select-none tabular-nums">
            01
          </span>
          <div class="space-y-1.5 text-right lg:text-left">
            <div class="font-mono text-[11px] tracking-[0.14em] text-[#161513] tabular-nums">
              {{ formatOccurredAt(journals[0].occurredAt) }}
            </div>
            <div class="flex lg:flex-col gap-2 lg:gap-1 font-serif text-xs text-[#787268]">
              <span v-if="journals[0].mood" class="text-[#9A3F2B]">心境 · {{ journals[0].mood }}</span>
              <span v-if="journals[0].weather">天色 · {{ journals[0].weather }}</span>
              <span class="font-mono text-[10px] text-[#9B9488] tabular-nums">{{ journals[0].wordCount }} WORDS</span>
              <span v-if="journals[0].visibility === 'private'" class="font-mono text-[10px] text-[#9A6B2F] tracking-widest uppercase">
                PRIVATE
              </span>
            </div>
          </div>
        </div>

        <div class="lg:col-span-9 flex flex-col justify-between gap-6">
          <div class="space-y-4">
            <div class="flex items-start justify-between gap-4">
              <span class="kicker-caps text-[#9A3F2B]">FEATURED FOLIO</span>
              <div
                v-if="authStore.isAdmin"
                class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                @click.stop
              >
                <button
                  type="button"
                  class="p-1.5 text-[#787268] hover:text-[#9A3F2B]"
                  @click="openEditModal(journals[0])"
                  title="编辑"
                >
                  <PencilIcon class="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  class="p-1.5 text-[#787268] hover:text-[#9A3F2B]"
                  @click="handleDeleteJournal(journals[0].id)"
                  title="删除"
                >
                  <Trash2Icon class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <h2 class="font-serif text-2xl sm:text-3xl lg:text-[34px] font-normal text-[#161513] group-hover:text-[#9A3F2B] transition-colors duration-300 leading-[1.35]">
              {{ journals[0].title }}
            </h2>

            <p class="font-serif text-[14.5px] sm:text-[15px] text-[#57534C] leading-[1.95] line-clamp-4 font-light">
              {{ journals[0].summary || '点击翻阅手札全文...' }}
            </p>
          </div>

          <div class="pt-5 border-t border-[#E8E2D6] flex items-center justify-between gap-4">
            <div class="flex flex-wrap gap-3">
              <span
                v-for="tag in dedupeTags(journals[0].tags)"
                :key="tag"
                class="text-[11px] font-mono text-[#787268]"
              >
                #{{ tag }}
              </span>
            </div>
            <span class="inline-flex items-center gap-2 text-xs font-serif tracking-[0.16em] text-[#161513] group-hover:text-[#9A3F2B] transition-colors shrink-0">
              <span>翻阅全文</span>
              <span class="font-mono transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
            </span>
          </div>
        </div>
      </article>

      <!-- Remaining Literary Folio Plates -->
      <div v-if="journals.length > 1" class="grid grid-cols-1 md:grid-cols-2 gap-7">
        <article
          v-for="(journal, idx) in journals.slice(1)"
          :key="journal.id"
          class="group museum-plate rounded-[2px] p-7 sm:p-8 cursor-pointer flex flex-col justify-between gap-6"
          @click="readingJournal = journal"
        >
          <div class="space-y-4">
            <div class="flex items-start justify-between gap-3">
              <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1 kicker-caps text-[#787268]">
                <span class="text-[#161513] tabular-nums">{{ formatOccurredAt(journal.occurredAt) }}</span>
                <span v-if="journal.mood" class="text-[#C4BBA9]">/</span>
                <span v-if="journal.mood" class="text-[#9A3F2B] font-serif tracking-normal normal-case text-[11px]">{{ journal.mood }}</span>
                <span v-if="journal.weather" class="text-[#C4BBA9]">/</span>
                <span v-if="journal.weather" class="font-serif tracking-normal normal-case text-[11px]">{{ journal.weather }}</span>
                <span v-if="journal.visibility === 'private'" class="text-[#9A6B2F]">· PRIVATE</span>
              </div>

              <div class="flex items-center gap-1.5 shrink-0">
                <span class="font-display italic text-xl text-[#C4BBA9] leading-none tabular-nums">
                  {{ String(idx + 2).padStart(2, '0') }}
                </span>
                <div
                  v-if="authStore.isAdmin"
                  class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  @click.stop
                >
                  <button
                    type="button"
                    class="p-1 text-[#787268] hover:text-[#9A3F2B]"
                    @click="openEditModal(journal)"
                    title="编辑"
                  >
                    <PencilIcon class="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    class="p-1 text-[#787268] hover:text-[#9A3F2B]"
                    @click="handleDeleteJournal(journal.id)"
                    title="删除"
                  >
                    <Trash2Icon class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <h3 class="font-serif text-xl sm:text-[22px] font-normal text-[#161513] group-hover:text-[#9A3F2B] transition-colors duration-300 leading-[1.4]">
              {{ journal.title }}
            </h3>

            <p class="font-serif text-[13.5px] text-[#57534C] line-clamp-3 leading-[1.85] font-light">
              {{ journal.summary || '点击翻阅手札全文...' }}
            </p>

            <div v-if="dedupeTags(journal.tags).length > 0" class="flex flex-wrap gap-2.5 pt-1">
              <span
                v-for="tag in dedupeTags(journal.tags)"
                :key="tag"
                class="text-[11px] font-mono text-[#787268]"
              >
                #{{ tag }}
              </span>
            </div>
          </div>

          <div class="pt-4 border-t border-[#E8E2D6] flex items-center justify-between text-[11px]">
            <span class="font-mono text-[#9B9488] tabular-nums">{{ journal.wordCount }} 字</span>
            <span class="font-serif tracking-[0.14em] text-[#787268] group-hover:text-[#9A3F2B] inline-flex items-center gap-1.5 transition-colors">
              <span>翻阅</span>
              <span class="font-mono transition-transform duration-300 group-hover:translate-x-0.5">&rarr;</span>
            </span>
          </div>
        </article>
      </div>

      <!-- Pagination -->
      <div v-if="hasMore" class="pt-6 text-center">
        <button
          type="button"
          :disabled="isLoadingMore"
          class="inline-flex items-center gap-3 px-8 py-3 rounded-[2px] border border-[#161513] text-xs font-serif tracking-[0.18em] text-[#161513] hover:bg-[#161513] hover:text-[#FAF8F4] transition-colors duration-200 disabled:opacity-40"
          @click="loadJournals(false)"
        >
          <Loader2Icon v-if="isLoadingMore" class="w-3.5 h-3.5 animate-spin" />
          <span>{{ isLoadingMore ? '翻阅往期手札...' : '加载更多手札' }}</span>
        </button>
      </div>
    </div>
    </Transition>

    <!-- ========================================================= -->
    <!-- BOOK-SHEET READING MODAL                                  -->
    <!-- ========================================================= -->
    <Teleport to="body">
      <div
        v-if="readingJournal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
      >
        <div class="fixed inset-0 bg-[#161513]/55 backdrop-blur-xs" @click="readingJournal = null"></div>
        <div
          class="relative w-full max-w-3xl max-h-[88vh] flex flex-col rounded-[2px] border border-[#DDD6C9] bg-[#FAF8F4] shadow-[0_32px_80px_-20px_rgba(22,21,19,0.45)] overflow-hidden"
        >
          <!-- Editorial Reader Header -->
          <div class="flex items-start justify-between border-b border-[#DDD6C9] px-7 sm:px-12 py-6 bg-[#F3EFE7]/75 gap-4">
            <div class="min-w-0 space-y-2">
              <div class="flex flex-wrap items-center gap-2.5 kicker-caps text-[#787268]">
                <span class="text-[#9A3F2B] tabular-nums">{{ formatOccurredAt(readingJournal.occurredAt) }}</span>
                <span v-if="readingJournal.mood" class="text-[#C4BBA9]">/</span>
                <span v-if="readingJournal.mood" class="font-serif tracking-normal normal-case text-xs">{{ readingJournal.mood }}</span>
                <span v-if="readingJournal.weather" class="text-[#C4BBA9]">/</span>
                <span v-if="readingJournal.weather" class="font-serif tracking-normal normal-case text-xs">{{ readingJournal.weather }}</span>
                <span class="text-[#C4BBA9]">/</span>
                <span class="tabular-nums">{{ readingJournal.wordCount }} 字</span>
              </div>
              <h3 class="font-serif text-2xl sm:text-3xl font-normal text-[#161513] leading-[1.35]">
                {{ readingJournal.title }}
              </h3>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button
                v-if="authStore.isAdmin"
                type="button"
                class="p-2 text-[#787268] hover:text-[#9A3F2B] transition-colors"
                @click="openEditFromReader(readingJournal)"
                title="编辑手札"
              >
                <PencilIcon class="w-4 h-4" />
              </button>
              <button
                type="button"
                class="p-2 text-[#787268] hover:text-[#161513] transition-colors"
                @click="readingJournal = null"
              >
                <XIcon class="w-5 h-5" />
              </button>
            </div>
          </div>

          <!-- Formatted Book Prose Body -->
          <div class="flex-1 overflow-y-auto px-7 sm:px-12 py-8 sm:py-10 bg-[#FAF8F4]">
            <div
              class="max-w-[64ch] mx-auto text-[15.5px]"
              v-html="renderMarkdown(readingJournal.contentMarkdown || readingJournal.summary || '')"
            ></div>
            <div
              v-if="dedupeTags(readingJournal.tags).length > 0"
              class="max-w-[64ch] mx-auto mt-10 pt-5 border-t border-[#E8E2D6] flex flex-wrap gap-3"
            >
              <span
                v-for="tag in dedupeTags(readingJournal.tags)"
                :key="tag"
                class="text-[11px] font-mono text-[#787268]"
              >
                #{{ tag }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ========================================================= -->
    <!-- WRITE / EDIT JOURNAL MODAL                                -->
    <!-- ========================================================= -->
    <Teleport to="body">
      <div
        v-if="isWriteModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
      >
        <div class="fixed inset-0 bg-[#161513]/55 backdrop-blur-xs" @click="isWriteModalOpen = false"></div>
        <div class="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[2px] border border-[#DDD6C9] bg-[#F3EFE7] shadow-2xl overflow-hidden">
          <div class="flex items-center justify-between border-b border-[#DDD6C9] px-6 py-4 bg-[#FAF8F4]">
            <div class="space-y-0.5">
              <span class="kicker-caps text-[#9A3F2B] block">CAHIER EDITOR</span>
              <h3 class="font-serif text-lg font-normal text-[#161513]">
                {{ editingJournalId ? '修订随想手札' : '撰写时光手札' }}
              </h3>
            </div>
            <button
              type="button"
              class="p-1.5 text-[#787268] hover:text-[#161513]"
              @click="isWriteModalOpen = false"
            >
              <XIcon class="w-5 h-5" />
            </button>
          </div>

          <form @submit.prevent="handleSaveJournal" class="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
            <div>
              <label class="block kicker-caps text-[#787268] mb-1.5">手札标题 *</label>
              <input
                v-model="form.title"
                type="text"
                required
                placeholder="例如：冬日初雪漫谈 / 岁末思绪"
                class="w-full editorial-field px-3.5 py-2.5 text-sm"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label class="block kicker-caps text-[#787268] mb-1.5">发生时间</label>
                <input
                  v-model="occurredAtStr"
                  type="datetime-local"
                  required
                  class="w-full editorial-field px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label class="block kicker-caps text-[#787268] mb-1.5">今日心境</label>
                <select v-model="form.mood" class="w-full editorial-field px-3 py-2">
                  <option v-for="m in moodOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
                </select>
              </div>
              <div>
                <label class="block kicker-caps text-[#787268] mb-1.5">天气状况</label>
                <select v-model="form.weather" class="w-full editorial-field px-3 py-2">
                  <option value="晴朗">晴朗温暖</option>
                  <option value="多云">微风多云</option>
                  <option value="细雨">蒙蒙细雨</option>
                  <option value="降雪">冬日初雪</option>
                  <option value="夜色">静谧夜晚</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label class="block kicker-caps text-[#787268] mb-1.5">可见权限</label>
                <select v-model="form.visibility" class="w-full editorial-field px-3 py-2">
                  <option value="public">公开策展 (Public)</option>
                  <option value="private">私密仅己可见 (Private)</option>
                </select>
              </div>
              <div>
                <label class="block kicker-caps text-[#787268] mb-1.5">标签 (逗号分隔)</label>
                <input
                  v-model="tagsInput"
                  type="text"
                  placeholder="例如：随笔, 阅读, 思辨"
                  class="w-full editorial-field px-3.5 py-2"
                />
              </div>
            </div>

            <div>
              <label class="block kicker-caps text-[#787268] mb-1.5">简要导言 (可选)</label>
              <input
                v-model="form.summary"
                type="text"
                placeholder="一句话概括今日的心境..."
                class="w-full editorial-field px-3.5 py-2"
              />
            </div>

            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="block kicker-caps text-[#787268]">手札正文 (MARKDOWN) *</label>
                <span class="font-mono text-[10px] text-[#9B9488] tabular-nums">约 {{ form.contentMarkdown.trim().length }} 字</span>
              </div>
              <textarea
                v-model="form.contentMarkdown"
                required
                rows="8"
                placeholder="# 标题&#10;&#10;书写这一天的点点滴滴、灵感与思考..."
                class="w-full editorial-field p-3.5 leading-relaxed font-mono text-xs"
              ></textarea>
            </div>

            <div class="flex items-center justify-end gap-3 pt-4 border-t border-[#DDD6C9]">
              <button
                type="button"
                class="px-4 py-2 text-[#787268] hover:text-[#161513] font-serif tracking-wider"
                @click="isWriteModalOpen = false"
              >
                取消
              </button>
              <button
                type="submit"
                :disabled="isSubmitting"
                class="inline-flex items-center gap-2 px-6 py-2.5 rounded-[2px] bg-[#161513] text-[#FAF8F4] font-serif tracking-[0.14em] hover:bg-[#9A3F2B] transition-colors disabled:opacity-50"
              >
                <Loader2Icon v-if="isSubmitting" class="w-3.5 h-3.5 animate-spin" />
                <span>{{ editingJournalId ? '保存修订' : '归档手札' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import {
  PenSquare as PenSquareIcon,
  Search as SearchIcon,
  Pencil as PencilIcon,
  Trash2 as Trash2Icon,
  X as XIcon,
  Loader2 as Loader2Icon,
} from 'lucide-vue-next';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { useUiStore } from '@/shared/stores/ui.store';
import { apiClient } from '@/shared/api/client';
import { renderMarkdown } from '@/shared/utils/markdown';
import { formatDate } from '@archive/shared';
import type { Visibility } from '@archive/contracts';

const authStore = useAuthStore();
const uiStore = useUiStore();

interface JournalItem {
  id: string;
  title: string;
  summary?: string | null;
  contentMarkdown: string;
  mood?: string | null;
  weather?: string | null;
  wordCount: number;
  occurredAt: number;
  visibility: Visibility;
  tags?: string[];
}

const moodOptions = [
  { value: '晴朗', label: '晴朗畅快' },
  { value: '宁静', label: '宁静致远' },
  { value: '雀跃', label: '欣喜雀跃' },
  { value: '沉思', label: '深夜沉思' },
];

const isLoading = ref(true);
const isLoadingMore = ref(false);
const isSubmitting = ref(false);
const journals = ref<JournalItem[]>([]);
const nextCursor = ref<string | null>(null);
const hasMore = ref(false);
const searchKeyword = ref('');
const selectedMood = ref('');

const readingJournal = ref<JournalItem | null>(null);
const isWriteModalOpen = ref(false);
const editingJournalId = ref<string | null>(null);
const occurredAtStr = ref('');
const tagsInput = ref('');

const form = ref<{
  title: string;
  mood: string;
  weather: string;
  summary: string;
  contentMarkdown: string;
  visibility: Visibility;
}>({
  title: '',
  mood: '宁静',
  weather: '晴朗',
  summary: '',
  contentMarkdown: '',
  visibility: 'public',
});

function dedupeTags(rawTags?: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of rawTags ?? []) {
    const tag = raw.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
  }
  return result;
}

function formatOccurredAt(ts?: number): string {
  if (!ts) return '';
  return formatDate(ts, '.');
}

function toLocalDatetimeInput(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function openCreateModal() {
  editingJournalId.value = null;
  form.value = {
    title: '',
    mood: '宁静',
    weather: '晴朗',
    summary: '',
    contentMarkdown: '',
    visibility: 'public',
  };
  occurredAtStr.value = toLocalDatetimeInput(Date.now());
  tagsInput.value = '';
  isWriteModalOpen.value = true;
}

function openEditModal(journal: JournalItem) {
  editingJournalId.value = journal.id;
  form.value = {
    title: journal.title,
    mood: journal.mood || '宁静',
    weather: journal.weather || '晴朗',
    summary: journal.summary || '',
    contentMarkdown: journal.contentMarkdown || '',
    visibility: journal.visibility || 'public',
  };
  occurredAtStr.value = toLocalDatetimeInput(journal.occurredAt);
  tagsInput.value = (journal.tags || []).join(', ');
  isWriteModalOpen.value = true;
}

function openEditFromReader(journal: JournalItem) {
  readingJournal.value = null;
  openEditModal(journal);
}

let searchTimer: number | null = null;
function handleSearchDebounced() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    loadJournals(true);
  }, 300);
}

function selectMood(mood: string) {
  selectedMood.value = mood;
  loadJournals(true);
}

let activeRequestSeq = 0;

async function loadJournals(reset: boolean = true) {
  const reqSeq = ++activeRequestSeq;

  if (reset) {
    isLoading.value = true;
    nextCursor.value = null;
  } else {
    isLoadingMore.value = true;
  }

  try {
    const params: Record<string, string | number> = { limit: 20 };
    if (selectedMood.value) params.mood = selectedMood.value;
    if (searchKeyword.value.trim()) params.search = searchKeyword.value.trim();
    if (!reset && nextCursor.value) params.cursor = nextCursor.value;

    const res = await apiClient.getPaginated<JournalItem>('/api/v1/journals', { params });
    if (reqSeq !== activeRequestSeq) return;

    if (reset) {
      journals.value = res.items;
    } else {
      journals.value = [...journals.value, ...res.items];
    }
    nextCursor.value = res.pagination.cursor;
    hasMore.value = res.pagination.hasMore;
  } catch (err: any) {
    if (reqSeq === activeRequestSeq) {
      uiStore.notifyError(err?.message || '加载随想手札失败');
    }
  } finally {
    if (reqSeq === activeRequestSeq) {
      isLoading.value = false;
      isLoadingMore.value = false;
    }
  }
}

async function handleSaveJournal() {
  const occurredAt = new Date(occurredAtStr.value).getTime();
  if (isNaN(occurredAt) || occurredAt <= 0) {
    uiStore.notifyError('请选择合法的发生时间');
    return;
  }

  const tags = tagsInput.value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  isSubmitting.value = true;
  try {
    const payload = {
      title: form.value.title.trim(),
      summary: form.value.summary.trim() || null,
      contentMarkdown: form.value.contentMarkdown,
      mood: form.value.mood,
      weather: form.value.weather,
      visibility: form.value.visibility,
      occurredAt,
      tags,
    };

    if (editingJournalId.value) {
      await apiClient.put<JournalItem>(`/api/v1/journals/${editingJournalId.value}`, payload);
      uiStore.notifySuccess('手札修订已保存');
    } else {
      await apiClient.post<JournalItem>('/api/v1/journals', payload);
      uiStore.notifySuccess('新随想手札已归档');
    }

    isWriteModalOpen.value = false;
    await loadJournals(true);
  } catch (err: any) {
    uiStore.notifyError(err?.message || '保存手札失败');
  } finally {
    isSubmitting.value = false;
  }
}

async function handleDeleteJournal(id: string) {
  const ok = await uiStore.confirm({
    title: '删除随想手札',
    message: '确定要删除这篇手札吗？删除后将不再显示。',
    confirmLabel: '确认删除',
    danger: true,
  });
  if (!ok) return;

  try {
    await apiClient.delete(`/api/v1/journals/${id}`);
    journals.value = journals.value.filter((j) => j.id !== id);
    if (readingJournal.value?.id === id) readingJournal.value = null;
    uiStore.notifySuccess('已移除该篇手札');
  } catch (err: any) {
    uiStore.notifyError(err?.message || '删除手札失败');
  }
}

watch(
  () => authStore.isAdmin,
  () => {
    loadJournals(true);
  }
);

watch(
  () => uiStore.pendingAction,
  (action) => {
    if (action === 'journal') {
      uiStore.consumeQuickAction('journal');
      openCreateModal();
    }
  },
  { immediate: true }
);

function handleGlobalKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (isWriteModalOpen.value) {
      isWriteModalOpen.value = false;
    } else if (readingJournal.value) {
      readingJournal.value = null;
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeyDown);
  loadJournals(true);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeyDown);
});
</script>
