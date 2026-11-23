<template>
  <Teleport to="body">
    <div
      v-if="modelValue && entry"
      class="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="fixed inset-0 bg-[#161513]/60 backdrop-blur-xs transition-opacity"
        @click="close"
      ></div>

      <div
        class="relative w-full rounded-[2px] border border-[#DDD6C9] bg-[#FAF8F4] shadow-[0_32px_80px_-20px_rgba(22,21,19,0.45)] transition-[max-width] duration-300"
        :class="modalContainerClass"
      >
        <!-- ========================================================= -->
        <!-- PORTRAIT MODE: MOBILE HEADER (< lg) + LEFT PHOTO STAGE    -->
        <!-- ========================================================= -->
        <template v-if="layoutMode === 'portrait'">
          <!-- Mobile-only Header (< lg) -->
          <div class="lg:hidden flex items-start justify-between gap-4 border-b border-[#DDD6C9] bg-[#F3EFE7]/90 px-4 sm:px-6 py-4 shrink-0">
            <div class="min-w-0 space-y-1.5">
              <div class="flex flex-wrap items-center gap-2 kicker-caps text-[#787268]">
                <span class="text-[#9A3F2B]">{{ typeLabel }}</span>
                <span class="text-[#C4BBA9]">/</span>
                <span class="tabular-nums">{{ formatDateTime(entry.occurredAt, false) }}</span>
                <span v-if="entry.visibility === 'private'" class="text-[#9A6B2F]">· PRIVATE</span>
                <span v-if="entry.status === 'draft'" class="text-[#9B9488]">· DRAFT</span>
              </div>
              <h2 class="font-serif text-xl sm:text-2xl font-normal text-[#161513] leading-[1.35] break-words">
                {{ entry.title }}
              </h2>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <button
                v-if="randomMode"
                type="button"
                :disabled="isDrawingRandom"
                class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[2px] border border-[#C4BBA9] bg-[#FAF8F4]/90 text-[11px] font-serif tracking-[0.12em] text-[#57534C] hover:border-[#9A3F2B] hover:text-[#9A3F2B] transition-colors disabled:opacity-50"
                @click="emit('draw-random', entry.id)"
                title="再随机抽取另一卷展品"
              >
                <Loader2Icon v-if="isDrawingRandom" class="w-3 h-3 animate-spin text-[#9A3F2B]" />
                <ShuffleIcon v-else class="w-3 h-3" />
                <span>再抽一卷</span>
              </button>
              <button
                v-if="isAdmin"
                type="button"
                class="p-2 text-[#787268] hover:text-[#9A3F2B] transition-colors"
                @click="emit('edit', entry); close()"
                title="编辑条目"
              >
                <PencilIcon class="w-4 h-4" />
              </button>
              <button
                type="button"
                class="p-2 text-[#787268] hover:text-[#161513] transition-colors"
                @click="close"
                title="关闭 (ESC)"
              >
                <XIcon class="w-5 h-5" />
              </button>
            </div>
          </div>

          <!-- Left Column: Full-Height Portrait Artwork Stage -->
          <div
            class="lg:w-[55%] xl:w-[58%] lg:h-full bg-[#EAE4D8]/55 border-b lg:border-b-0 lg:border-r border-[#DDD6C9] flex flex-col items-center justify-center p-2.5 sm:p-4 relative shrink-0 min-w-0"
          >
            <div
              class="relative group w-full flex-1 min-h-0 flex items-center justify-center overflow-hidden bg-[#EAE4D8]/70 cursor-zoom-in"
              @click="openLightbox(activeMediaIndex)"
            >
              <img
                ref="coverImgRef"
                :key="activeImageUrl || 'portrait'"
                :src="activeImageUrl || ''"
                :alt="activeItem?.title || entry.title"
                class="max-h-[58vh] lg:max-h-full lg:h-full w-full object-contain select-none transition-transform duration-500 ease-gallery group-hover:scale-[1.01]"
                @load="onImageLoad"
              />
              <button
                type="button"
                class="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[2px] bg-[#161513]/75 hover:bg-[#9A3F2B] text-[#FAF8F4] text-[10px] font-mono tracking-[0.14em] uppercase opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 backdrop-blur-xs"
                @click.stop="openLightbox(activeMediaIndex)"
                title="在全屏看图室细看"
              >
                <Maximize2Icon class="w-3 h-3" />
                <span>全屏看图</span>
              </button>
            </div>

            <!-- Multi-photo filmstrip switcher -->
            <div
              v-if="galleryItems.length > 1"
              class="w-full flex items-center justify-center gap-2 pt-2.5 overflow-x-auto"
            >
              <button
                v-for="(item, idx) in galleryItems"
                :key="item.id + '_' + idx"
                type="button"
                class="h-12 w-12 shrink-0 overflow-hidden rounded-[2px] border transition-all"
                :class="
                  idx === activeMediaIndex
                    ? 'border-[#9A3F2B] ring-1 ring-[#9A3F2B]'
                    : 'border-[#DDD6C9] opacity-65 hover:opacity-100'
                "
                @click="activeMediaIndex = idx"
              >
                <img
                  :src="item.thumbUrl || item.url"
                  :alt="item.title || entry.title"
                  class="w-full h-full object-cover"
                />
              </button>
            </div>
          </div>

          <!-- Right Column: Editorial Header + Details + Comments -->
          <div class="lg:w-[45%] xl:w-[42%] lg:h-full flex flex-col min-w-0 flex-1 bg-[#FAF8F4]">
            <!-- Desktop-only Header -->
            <div class="hidden lg:flex items-start justify-between gap-4 border-b border-[#DDD6C9] bg-[#F3EFE7]/80 px-6 xl:px-7 py-5 shrink-0">
              <div class="min-w-0 space-y-1.5">
                <div class="flex flex-wrap items-center gap-2 kicker-caps text-[#787268]">
                  <span class="text-[#9A3F2B]">{{ typeLabel }}</span>
                  <span class="text-[#C4BBA9]">/</span>
                  <span class="tabular-nums">{{ formatDateTime(entry.occurredAt, false) }}</span>
                  <span v-if="entry.visibility === 'private'" class="text-[#9A6B2F]">· PRIVATE</span>
                  <span v-if="entry.status === 'draft'" class="text-[#9B9488]">· DRAFT</span>
                </div>
                <h2 class="font-serif text-2xl font-normal text-[#161513] leading-[1.35] break-words">
                  {{ entry.title }}
                </h2>
              </div>

              <div class="flex items-center gap-1.5 shrink-0">
                <button
                  v-if="randomMode"
                  type="button"
                  :disabled="isDrawingRandom"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[2px] border border-[#C4BBA9] bg-[#FAF8F4]/90 text-[11px] font-serif tracking-[0.12em] text-[#57534C] hover:border-[#9A3F2B] hover:text-[#9A3F2B] transition-colors disabled:opacity-50"
                  @click="emit('draw-random', entry.id)"
                  title="再随机抽取另一卷展品"
                >
                  <Loader2Icon v-if="isDrawingRandom" class="w-3 h-3 animate-spin text-[#9A3F2B]" />
                  <ShuffleIcon v-else class="w-3 h-3" />
                  <span>再抽一卷</span>
                </button>
                <button
                  v-if="isAdmin"
                  type="button"
                  class="p-2 text-[#787268] hover:text-[#9A3F2B] transition-colors"
                  @click="emit('edit', entry); close()"
                  title="编辑条目"
                >
                  <PencilIcon class="w-4 h-4" />
                </button>
                <button
                  type="button"
                  class="p-2 text-[#787268] hover:text-[#161513] transition-colors"
                  @click="close"
                  title="关闭 (ESC)"
                >
                  <XIcon class="w-5 h-5" />
                </button>
              </div>
            </div>

            <!-- Scrollable Metadata, Copy, Tags & Guestbook -->
            <div class="lg:flex-1 lg:overflow-y-auto px-4 sm:px-6 xl:px-7 py-5 sm:py-6 space-y-6">
              <!-- EXIF & Location Metadata Strip -->
              <div
                v-if="hasOpticalOrLocationInfo"
                class="border border-[#E5DEC9] bg-[#F3EFE7]/60 rounded-[2px] px-3.5 py-3 space-y-2 text-[11px]"
              >
                <div v-if="opticalSummaryParts.length" class="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[#57534C]">
                  <CameraIcon class="w-3.5 h-3.5 text-[#9A3F2B] shrink-0" />
                  <span
                    v-for="(part, i) in opticalSummaryParts"
                    :key="i"
                    :class="i === 0 ? 'text-[#161513] font-medium' : ''"
                  >
                    {{ part }}
                  </span>
                </div>
                <div v-if="locationSummaryText" class="flex items-center gap-2 font-serif text-[#57534C]">
                  <MapPinIcon class="w-3.5 h-3.5 text-[#3D4E42] shrink-0" />
                  <span class="truncate">{{ locationSummaryText }}</span>
                </div>
              </div>

              <!-- Summary -->
              <p
                v-if="entry.summary && !journalDetail?.contentMarkdown"
                class="font-serif text-[14.5px] text-[#262420] leading-[1.9] whitespace-pre-line font-light"
              >
                {{ entry.summary }}
              </p>

              <!-- Journal Markdown Detail -->
              <div v-if="isLoadingDetail" class="py-6 flex items-center justify-center text-xs font-mono text-[#9B9488] gap-2.5 tracking-widest uppercase">
                <Loader2Icon class="w-4 h-4 animate-spin text-[#9A3F2B]" />
                <span>Retrieving Archival Folio...</span>
              </div>

              <div v-else-if="journalDetail" class="space-y-4">
                <div class="flex flex-wrap items-center gap-4 kicker-caps text-[#787268] border-b border-[#E8E2D6] pb-3">
                  <span v-if="journalDetail.mood" class="text-[#9A3F2B]">心境 · {{ journalDetail.mood }}</span>
                  <span v-if="journalDetail.weather">天色 · {{ journalDetail.weather }}</span>
                  <span class="tabular-nums">{{ journalDetail.wordCount }} WORDS</span>
                </div>
                <div
                  class="text-[15px] leading-[1.85]"
                  v-html="renderMarkdown(journalDetail.contentMarkdown)"
                ></div>
              </div>

              <!-- Trip Map & Stops Detail -->
              <div v-else-if="tripDetail" class="space-y-4">
                <div class="passe-partout p-2">
                  <LeafletMap
                    :markers="tripMarkers"
                    :polyline="tripPolyline"
                    height="220px"
                  />
                </div>
                <div class="border-t border-[#DDD6C9] pt-3 space-y-2.5 text-xs">
                  <div class="flex items-baseline justify-between">
                    <span class="font-serif text-sm text-[#161513]">{{ tripDetail.citySummary || '旅行路线' }}</span>
                    <span class="font-display italic text-lg text-[#3D4E42] tabular-nums">
                      {{ (tripDetail.distanceKm || 0).toFixed(1) }} <span class="text-xs font-mono not-italic text-[#787268]">km</span>
                    </span>
                  </div>
                  <div v-if="tripDetail.locations?.length" class="grid grid-cols-1 gap-2 pt-1">
                    <div
                      v-for="(loc, idx) in tripDetail.locations"
                      :key="loc.id"
                      class="border border-[#DDD6C9] bg-[#F3EFE7]/60 px-3 py-2 rounded-[2px]"
                    >
                      <div class="font-serif text-[#161513]">
                        <span class="font-display italic text-[#9A3F2B] mr-1.5">{{ String(idx + 1).padStart(2, '0') }}</span>
                        {{ loc.name }}
                      </div>
                      <div v-if="loc.notes" class="text-[11px] text-[#57534C] mt-0.5 font-light">{{ loc.notes }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Tags -->
              <div v-if="uniqueTags.length > 0" class="flex flex-wrap gap-2.5 pt-1">
                <span
                  v-for="tag in uniqueTags"
                  :key="tag"
                  class="text-[11px] font-mono text-[#787268]"
                >
                  #{{ tag }}
                </span>
              </div>

              <!-- Guestbook / Comments Section -->
              <section class="border-t border-[#DDD6C9] pt-6 space-y-4">
                <div class="flex items-baseline justify-between">
                  <div class="flex items-baseline gap-2.5">
                    <h4 class="font-serif text-base font-normal text-[#161513]">观展题记</h4>
                    <span class="font-display italic text-xs text-[#9B9488]">Guestbook ({{ comments.length }})</span>
                  </div>
                </div>

                <!-- Post Comment Form (compact two-field layout for side panel) -->
                <form @submit.prevent="handlePostComment" class="border border-[#DDD6C9] bg-[#F3EFE7]/60 p-4 space-y-2.5 text-xs rounded-[2px]">
                  <textarea
                    v-model="commentForm.content"
                    rows="2"
                    required
                    maxlength="2000"
                    placeholder="留下你的观展随感..."
                    class="w-full editorial-field px-3 py-2"
                  ></textarea>
                  <div class="flex flex-col sm:flex-row sm:items-center gap-2.5">
                    <input
                      v-model="commentForm.authorName"
                      type="text"
                      maxlength="50"
                      placeholder="署名（选填，留空默认为匿名）"
                      class="editorial-field flex-1 min-w-0 px-3 py-1.5"
                    />
                    <button
                      type="submit"
                      :disabled="isPostingComment"
                      class="inline-flex items-center justify-center gap-2 shrink-0 rounded-[2px] bg-[#161513] px-4 py-1.5 text-xs font-serif tracking-[0.14em] text-[#FAF8F4] hover:bg-[#9A3F2B] transition-colors disabled:opacity-50"
                    >
                      <Loader2Icon v-if="isPostingComment" class="w-3 h-3 animate-spin" />
                      <span>落款留言</span>
                    </button>
                  </div>
                </form>

                <!-- Comment List -->
                <div v-if="comments.length === 0" class="text-xs text-[#9B9488] font-serif py-1">
                  暂无观展题记，欢迎留下第一笔足迹。
                </div>
                <div v-else class="divide-y divide-[#E8E2D6] border-t border-[#E8E2D6]">
                  <div
                    v-for="comment in comments"
                    :key="comment.id"
                    class="py-3.5 text-xs space-y-1.5"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <div class="flex items-baseline gap-2 min-w-0">
                        <span class="font-serif text-[13px] font-medium text-[#161513] truncate">{{ comment.authorName }}</span>
                        <span class="font-mono text-[10px] text-[#9B9488] shrink-0">
                          {{ formatRelativeTime(comment.createdAt) }}
                        </span>
                      </div>
                      <div v-if="isAdmin" class="flex items-center gap-2.5 shrink-0">
                        <button
                          type="button"
                          class="text-[10px] font-mono text-[#787268] hover:text-[#9A3F2B]"
                          @click="handleMarkSpam(comment.id)"
                        >
                          标为垃圾
                        </button>
                        <button
                          type="button"
                          class="text-[10px] font-mono text-[#787268] hover:text-[#9A3F2B]"
                          @click="handleDeleteComment(comment.id)"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                    <p class="font-serif text-[13px] text-[#57534C] leading-[1.8] whitespace-pre-line font-light break-words">{{ comment.content }}</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </template>

        <!-- ========================================================= -->
        <!-- LANDSCAPE / PURE TEXT MODE: TOP-TO-BOTTOM ARCHIVAL FLOW   -->
        <!-- ========================================================= -->
        <template v-else>
          <!-- Editorial Header -->
          <div
            class="flex items-start justify-between gap-4 border-b border-[#DDD6C9] bg-[#F3EFE7]/80 shrink-0"
            :class="layoutMode === 'landscape' ? 'px-5 sm:px-8 py-4 sm:py-5' : 'px-6 sm:px-10 py-6'"
          >
            <div class="min-w-0 space-y-1.5">
              <div class="flex flex-wrap items-center gap-2.5 kicker-caps text-[#787268]">
                <span class="text-[#9A3F2B]">{{ typeLabel }}</span>
                <span class="text-[#C4BBA9]">/</span>
                <span class="tabular-nums">{{ formatDateTime(entry.occurredAt, false) }}</span>
                <span v-if="entry.visibility === 'private'" class="text-[#9A6B2F]">· PRIVATE</span>
                <span v-if="entry.status === 'draft'" class="text-[#9B9488]">· DRAFT</span>
              </div>
              <h2 class="font-serif text-xl sm:text-2xl lg:text-3xl font-normal text-[#161513] leading-[1.35] break-words">
                {{ entry.title }}
              </h2>
            </div>

            <div class="flex items-center gap-1.5 shrink-0">
              <button
                v-if="randomMode"
                type="button"
                :disabled="isDrawingRandom"
                class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[2px] border border-[#C4BBA9] bg-[#FAF8F4]/90 text-[11px] font-serif tracking-[0.12em] text-[#57534C] hover:border-[#9A3F2B] hover:text-[#9A3F2B] transition-colors disabled:opacity-50"
                @click="emit('draw-random', entry.id)"
                title="再随机抽取另一卷展品"
              >
                <Loader2Icon v-if="isDrawingRandom" class="w-3 h-3 animate-spin text-[#9A3F2B]" />
                <ShuffleIcon v-else class="w-3 h-3" />
                <span>再抽一卷</span>
              </button>
              <button
                v-if="isAdmin"
                type="button"
                class="p-2 text-[#787268] hover:text-[#9A3F2B] transition-colors"
                @click="emit('edit', entry); close()"
                title="编辑条目"
              >
                <PencilIcon class="w-4 h-4" />
              </button>
              <button
                type="button"
                class="p-2 text-[#787268] hover:text-[#161513] transition-colors"
                @click="close"
                title="关闭 (ESC)"
              >
                <XIcon class="w-5 h-5" />
              </button>
            </div>
          </div>

          <!-- Scrollable Archival Body -->
          <div
            class="flex-1 overflow-y-auto"
            :class="layoutMode === 'landscape' ? 'px-4 sm:px-7 py-4 sm:py-6 space-y-6' : 'px-6 sm:px-10 py-8 space-y-8'"
          >
            <!-- Wide Landscape Photo Stage (tight outer padding so details & text stay crisp) -->
            <div v-if="layoutMode === 'landscape' && activeImageUrl" class="space-y-2.5">
              <div
                class="relative group border border-[#DDD6C9] bg-[#EAE4D8]/60 p-1 sm:p-1.5 rounded-[2px] cursor-zoom-in overflow-hidden"
                @click="openLightbox(activeMediaIndex)"
              >
                <img
                  ref="coverImgRef"
                  :key="activeImageUrl"
                  :src="activeImageUrl"
                  :alt="activeItem?.title || entry.title"
                  class="w-full max-h-[68vh] object-contain mx-auto block bg-[#EAE4D8] select-none transition-transform duration-500 ease-gallery group-hover:scale-[1.005]"
                  @load="onImageLoad"
                />
                <button
                  type="button"
                  class="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] bg-[#161513]/75 hover:bg-[#9A3F2B] text-[#FAF8F4] text-[10px] font-mono tracking-[0.14em] uppercase opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 backdrop-blur-xs"
                  @click.stop="openLightbox(activeMediaIndex)"
                  title="在全屏看图室细看"
                >
                  <Maximize2Icon class="w-3 h-3" />
                  <span>全屏看图</span>
                </button>
              </div>

              <!-- Multi-photo filmstrip switcher -->
              <div
                v-if="galleryItems.length > 1"
                class="flex items-center gap-2 overflow-x-auto pt-1"
              >
                <button
                  v-for="(item, idx) in galleryItems"
                  :key="item.id + '_' + idx"
                  type="button"
                  class="h-12 w-16 shrink-0 overflow-hidden rounded-[2px] border transition-all"
                  :class="
                    idx === activeMediaIndex
                      ? 'border-[#9A3F2B] ring-1 ring-[#9A3F2B]'
                      : 'border-[#DDD6C9] opacity-65 hover:opacity-100'
                  "
                  @click="activeMediaIndex = idx"
                >
                  <img
                    :src="item.thumbUrl || item.url"
                    :alt="item.title || entry.title"
                    class="w-full h-full object-cover"
                  />
                </button>
              </div>

              <!-- Optical & Location Bar below wide image -->
              <div
                v-if="hasOpticalOrLocationInfo"
                class="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-[#E8E2D6] pb-3 text-[11px] text-[#57534C]"
              >
                <div v-if="opticalSummaryParts.length" class="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono">
                  <CameraIcon class="w-3.5 h-3.5 text-[#9A3F2B] shrink-0" />
                  <span
                    v-for="(part, i) in opticalSummaryParts"
                    :key="i"
                    :class="i === 0 ? 'text-[#161513] font-medium' : ''"
                  >
                    {{ part }}
                  </span>
                </div>
                <div v-if="locationSummaryText" class="flex items-center gap-1.5 font-serif">
                  <MapPinIcon class="w-3.5 h-3.5 text-[#3D4E42] shrink-0" />
                  <span>{{ locationSummaryText }}</span>
                </div>
              </div>
            </div>

            <!-- Prose & Details Container (comfortable reading measure) -->
            <div :class="layoutMode === 'landscape' ? 'max-w-4xl mx-auto space-y-7' : 'space-y-8'">
              <!-- Summary -->
              <p v-if="entry.summary && !journalDetail?.contentMarkdown" class="font-serif text-[15px] text-[#262420] leading-[1.95] whitespace-pre-line font-light">
                {{ entry.summary }}
              </p>

              <!-- Journal Markdown Detail -->
              <div v-if="isLoadingDetail" class="py-8 flex items-center justify-center text-xs font-mono text-[#9B9488] gap-2.5 tracking-widest uppercase">
                <Loader2Icon class="w-4 h-4 animate-spin text-[#9A3F2B]" />
                <span>Retrieving Archival Folio...</span>
              </div>

              <div v-else-if="journalDetail" class="space-y-5">
                <div class="flex flex-wrap items-center gap-4 kicker-caps text-[#787268] border-b border-[#E8E2D6] pb-3">
                  <span v-if="journalDetail.mood" class="text-[#9A3F2B]">心境 · {{ journalDetail.mood }}</span>
                  <span v-if="journalDetail.weather">天色 · {{ journalDetail.weather }}</span>
                  <span class="tabular-nums">{{ journalDetail.wordCount }} WORDS</span>
                </div>
                <div
                  class="text-[15.5px]"
                  v-html="renderMarkdown(journalDetail.contentMarkdown)"
                ></div>
              </div>

              <!-- Trip Map & Stops Detail -->
              <div v-else-if="tripDetail" class="space-y-5">
                <div class="passe-partout p-3">
                  <LeafletMap
                    :markers="tripMarkers"
                    :polyline="tripPolyline"
                    height="280px"
                  />
                </div>
                <div class="border-t border-[#DDD6C9] pt-4 space-y-3 text-xs">
                  <div class="flex items-baseline justify-between">
                    <span class="font-serif text-sm text-[#161513]">{{ tripDetail.citySummary || '旅行路线' }}</span>
                    <span class="font-display italic text-xl text-[#3D4E42] tabular-nums">
                      {{ (tripDetail.distanceKm || 0).toFixed(1) }} <span class="text-xs font-mono not-italic text-[#787268]">km</span>
                    </span>
                  </div>
                  <div v-if="tripDetail.locations?.length" class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div
                      v-for="(loc, idx) in tripDetail.locations"
                      :key="loc.id"
                      class="border border-[#DDD6C9] bg-[#F3EFE7]/60 px-3.5 py-2.5 rounded-[2px]"
                    >
                      <div class="font-serif text-[#161513]">
                        <span class="font-display italic text-[#9A3F2B] mr-1.5">{{ String(idx + 1).padStart(2, '0') }}</span>
                        {{ loc.name }}
                      </div>
                      <div v-if="loc.notes" class="text-[11px] text-[#57534C] mt-1 font-light">{{ loc.notes }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Tags -->
              <div v-if="uniqueTags.length > 0" class="flex flex-wrap gap-3 pt-1">
                <span
                  v-for="tag in uniqueTags"
                  :key="tag"
                  class="text-[11px] font-mono text-[#787268]"
                >
                  #{{ tag }}
                </span>
              </div>

              <!-- Guestbook / Comments Section -->
              <section class="border-t border-[#DDD6C9] pt-8 space-y-5">
                <div class="flex items-baseline justify-between">
                  <div class="flex items-baseline gap-2.5">
                    <h4 class="font-serif text-lg font-normal text-[#161513]">观展题记</h4>
                    <span class="font-display italic text-sm text-[#9B9488]">Guestbook ({{ comments.length }})</span>
                  </div>
                </div>

                <!-- Post Comment Form -->
                <form @submit.prevent="handlePostComment" class="border border-[#DDD6C9] bg-[#F3EFE7]/60 p-5 space-y-3 text-xs rounded-[2px]">
                  <textarea
                    v-model="commentForm.content"
                    rows="2"
                    required
                    maxlength="2000"
                    placeholder="留下你的观展随感..."
                    class="w-full editorial-field px-3 py-2"
                  ></textarea>
                  <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                    <input
                      v-model="commentForm.authorName"
                      type="text"
                      maxlength="50"
                      placeholder="署名（选填，留空默认为匿名）"
                      class="editorial-field flex-1 min-w-0 px-3 py-2"
                    />
                    <button
                      type="submit"
                      :disabled="isPostingComment"
                      class="inline-flex items-center justify-center gap-2 shrink-0 rounded-[2px] bg-[#161513] px-5 py-2 text-xs font-serif tracking-[0.14em] text-[#FAF8F4] hover:bg-[#9A3F2B] transition-colors disabled:opacity-50"
                    >
                      <Loader2Icon v-if="isPostingComment" class="w-3 h-3 animate-spin" />
                      <span>落款留言</span>
                    </button>
                  </div>
                </form>

                <!-- Comment List -->
                <div v-if="comments.length === 0" class="text-xs text-[#9B9488] font-serif py-2">
                  暂无观展题记，欢迎留下第一笔足迹。
                </div>
                <div v-else class="divide-y divide-[#E8E2D6] border-t border-[#E8E2D6]">
                  <div
                    v-for="comment in comments"
                    :key="comment.id"
                    class="py-4 text-xs space-y-1.5"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <div class="flex items-baseline gap-2.5">
                        <span class="font-serif text-[13px] font-medium text-[#161513]">{{ comment.authorName }}</span>
                        <span class="font-mono text-[10px] text-[#9B9488]">
                          {{ formatRelativeTime(comment.createdAt) }}
                        </span>
                      </div>
                      <div v-if="isAdmin" class="flex items-center gap-3">
                        <button
                          type="button"
                          class="text-[10px] font-mono text-[#787268] hover:text-[#9A3F2B]"
                          @click="handleMarkSpam(comment.id)"
                        >
                          标为垃圾
                        </button>
                        <button
                          type="button"
                          class="text-[10px] font-mono text-[#787268] hover:text-[#9A3F2B]"
                          @click="handleDeleteComment(comment.id)"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                    <p class="font-serif text-[13.5px] text-[#57534C] leading-[1.85] whitespace-pre-line font-light">{{ comment.content }}</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </template>
      </div>
    </div>
  </Teleport>

  <!-- Linked Fullscreen Darkroom Viewing Room -->
  <MediaLightbox
    v-model="isLightboxOpen"
    :items="galleryItems"
    :initial-index="activeMediaIndex"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import {
  X as XIcon,
  Pencil as PencilIcon,
  Loader2 as Loader2Icon,
  Maximize2 as Maximize2Icon,
  Camera as CameraIcon,
  MapPin as MapPinIcon,
  Shuffle as ShuffleIcon,
} from 'lucide-vue-next';
import { apiClient } from '@/shared/api/client';
import { useUiStore } from '@/shared/stores/ui.store';
import { renderMarkdown } from '@/shared/utils/markdown';
import LeafletMap, { type MapMarker } from '@/shared/components/map/LeafletMap.vue';
import MediaLightbox, { type LightboxItem } from '@/features/media/components/MediaLightbox.vue';
import { formatDateTime, formatRelativeTime } from '@archive/shared';
import type { EntryDto, CommentDto, EntryMediaDto, MediaAssetDto } from '@archive/contracts';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    entry: EntryDto | null;
    isAdmin: boolean;
    randomMode?: boolean;
    isDrawingRandom?: boolean;
  }>(),
  {
    randomMode: false,
    isDrawingRandom: false,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'edit', entry: EntryDto): void;
  (e: 'draw-random', currentEntryId: string): void;
}>();

const uiStore = useUiStore();

const isLoadingDetail = ref(false);
const journalDetail = ref<any>(null);
const tripDetail = ref<any>(null);
const entryMediaList = ref<EntryMediaDto[]>([]);
const coverAsset = ref<MediaAssetDto | null>(null);
const comments = ref<CommentDto[]>([]);
const isPostingComment = ref(false);

const coverImgRef = ref<HTMLImageElement | null>(null);
const naturalDimsMap = ref<Record<string, { width: number; height: number }>>({});
const activeMediaIndex = ref(0);
const isLightboxOpen = ref(false);

const commentForm = ref({
  authorName: '',
  content: '',
});

const uniqueTags = computed<string[]>(() => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of props.entry?.tags ?? []) {
    const tag = raw.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
  }
  return result;
});

function mapAssetToLightbox(asset: MediaAssetDto, fallbackTitle: string): LightboxItem {
  return {
    id: asset.id,
    title: asset.originalFilename
      ? asset.originalFilename.replace(/\.[^/.]+$/, '')
      : fallbackTitle,
    url: asset.originalUrl || asset.thumbUrl || '',
    thumbUrl: asset.thumbUrl || asset.originalUrl || '',
    width: asset.width,
    height: asset.height,
    sizeBytes: asset.sizeBytes,
    mimeType: asset.mimeType,
    occurredAt: props.entry?.occurredAt ?? asset.createdAt,
    visibility: asset.visibility,
    summary: props.entry?.summary,
    tags: uniqueTags.value,
    exif: asset.exif ?? undefined,
  };
}

const galleryItems = computed<LightboxItem[]>(() => {
  if (!props.entry) return [];
  const items: LightboxItem[] = [];
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();

  for (const binding of entryMediaList.value) {
    const asset = binding.asset;
    if (!asset || asset.mediaType !== 'image') continue;
    const url = asset.originalUrl || asset.thumbUrl;
    if (!url) continue;
    seenIds.add(asset.id);
    seenUrls.add(url);
    items.push({
      ...mapAssetToLightbox(asset, props.entry.title),
      title: binding.caption || props.entry.title,
    });
  }

  if (coverAsset.value && coverAsset.value.mediaType === 'image') {
    const url = coverAsset.value.originalUrl || coverAsset.value.thumbUrl;
    if (url && !seenIds.has(coverAsset.value.id) && !seenUrls.has(url)) {
      seenIds.add(coverAsset.value.id);
      seenUrls.add(url);
      items.unshift(mapAssetToLightbox(coverAsset.value, props.entry.title));
    }
  }

  if (props.entry.coverUrl && !seenUrls.has(props.entry.coverUrl)) {
    const coverAlreadyMatchedById =
      props.entry.coverMediaId !== null && seenIds.has(props.entry.coverMediaId);
    if (!coverAlreadyMatchedById) {
      items.unshift({
        id: props.entry.coverMediaId || props.entry.id,
        title: props.entry.title,
        url: props.entry.coverUrl,
        thumbUrl: props.entry.coverThumbUrl || props.entry.coverUrl,
        occurredAt: props.entry.occurredAt,
        visibility: props.entry.visibility,
        summary: props.entry.summary,
        tags: uniqueTags.value,
      });
    }
  }

  return items;
});

const activeItem = computed<LightboxItem | null>(() => {
  if (galleryItems.value.length === 0) return null;
  const clamped = Math.max(0, Math.min(activeMediaIndex.value, galleryItems.value.length - 1));
  return galleryItems.value[clamped] ?? null;
});

const activeImageUrl = computed<string | null>(() => {
  return activeItem.value?.url || activeItem.value?.thumbUrl || props.entry?.coverUrl || null;
});

const activeDimensions = computed<{ width: number; height: number } | null>(() => {
  const item = activeItem.value;
  if (item?.width && item?.height && item.width > 0 && item.height > 0) {
    return { width: item.width, height: item.height };
  }
  if (item?.exif?.width && item?.exif?.height && item.exif.width > 0 && item.exif.height > 0) {
    return { width: item.exif.width, height: item.exif.height };
  }
  const url = activeImageUrl.value;
  if (url && naturalDimsMap.value[url]) {
    return naturalDimsMap.value[url];
  }
  return null;
});

const layoutMode = computed<'text' | 'portrait' | 'landscape'>(() => {
  if (!activeImageUrl.value) return 'text';
  const dims = activeDimensions.value;
  if (dims && dims.height > dims.width) {
    return 'portrait';
  }
  return 'landscape';
});

const modalContainerClass = computed(() => {
  if (layoutMode.value === 'portrait') {
    return 'max-w-[min(95vw,1240px)] max-h-[92vh] lg:h-[min(90vh,860px)] flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden';
  }
  if (layoutMode.value === 'landscape') {
    return 'max-w-[min(95vw,1200px)] max-h-[92vh] flex flex-col overflow-hidden';
  }
  return 'max-w-3xl max-h-[90vh] flex flex-col overflow-hidden';
});

const opticalSummaryParts = computed<string[]>(() => {
  const parts: string[] = [];
  const exif = activeItem.value?.exif;
  if (exif?.model) {
    const modelStr =
      exif.make && !exif.model.toLowerCase().startsWith(exif.make.toLowerCase())
        ? `${exif.make} ${exif.model}`
        : exif.model;
    parts.push(modelStr);
  }
  if (exif?.focalLength) parts.push(`${exif.focalLength}mm`);
  if (exif?.fNumber) parts.push(`f/${exif.fNumber}`);
  if (exif?.exposureTime) parts.push(exif.exposureTime);
  if (exif?.iso) parts.push(`ISO ${exif.iso}`);
  if (exif?.dateTimeOriginal) parts.push(exif.dateTimeOriginal);
  if (activeDimensions.value) {
    parts.push(`${activeDimensions.value.width} × ${activeDimensions.value.height}`);
  }
  return parts;
});

const locationSummaryText = computed<string>(() => {
  if (tripDetail.value?.citySummary) return tripDetail.value.citySummary;
  if (tripDetail.value?.locations?.length) {
    return tripDetail.value.locations.map((l: any) => l.name).filter(Boolean).join(' · ');
  }
  const exif = activeItem.value?.exif;
  if (typeof exif?.latitude === 'number' && typeof exif?.longitude === 'number') {
    const lat = `${Math.abs(exif.latitude).toFixed(4)}°${exif.latitude >= 0 ? 'N' : 'S'}`;
    const lng = `${Math.abs(exif.longitude).toFixed(4)}°${exif.longitude >= 0 ? 'E' : 'W'}`;
    return `${lat}, ${lng}`;
  }
  return '';
});

const hasOpticalOrLocationInfo = computed(
  () => opticalSummaryParts.value.length > 0 || locationSummaryText.value.length > 0
);

const typeLabel = computed(() => {
  switch (props.entry?.type) {
    case 'trip':
      return 'EXPEDITION';
    case 'journal':
      return 'CAHIER';
    case 'photo':
      return 'PLATE';
    default:
      return 'ARCHIVE';
  }
});

const tripMarkers = computed<MapMarker[]>(() => {
  if (!tripDetail.value?.locations) return [];
  return tripDetail.value.locations.map((loc: any) => ({
    id: loc.id,
    lat: loc.latitude,
    lng: loc.longitude,
    title: loc.name,
    description: loc.notes ?? undefined,
  }));
});

const tripPolyline = computed<[number, number][]>(() => {
  if (!tripDetail.value?.locations || tripDetail.value.locations.length < 2) return [];
  return tripDetail.value.locations.map((loc: any) => [loc.latitude, loc.longitude]);
});

function captureImageDimensions(img: HTMLImageElement | null) {
  if (!img || !img.naturalWidth || !img.naturalHeight) return;
  const key = activeImageUrl.value;
  if (!key) return;
  naturalDimsMap.value = {
    ...naturalDimsMap.value,
    [key]: { width: img.naturalWidth, height: img.naturalHeight },
  };
}

function onImageLoad(event: Event) {
  captureImageDimensions(event.target as HTMLImageElement | null);
}

function openLightbox(index: number) {
  if (galleryItems.value.length === 0) return;
  activeMediaIndex.value = Math.max(0, Math.min(index, galleryItems.value.length - 1));
  isLightboxOpen.value = true;
}

function close() {
  isLightboxOpen.value = false;
  emit('update:modelValue', false);
}

let detailRequestSeq = 0;

async function loadDetails(entry: EntryDto) {
  const reqSeq = ++detailRequestSeq;
  journalDetail.value = null;
  tripDetail.value = null;
  entryMediaList.value = [];
  coverAsset.value = null;
  comments.value = [];
  activeMediaIndex.value = 0;
  isLightboxOpen.value = false;
  isLoadingDetail.value = true;

  try {
    const tasks: Promise<void>[] = [];

    if (entry.type === 'journal') {
      tasks.push(
        apiClient
          .get(`/api/v1/journals/${entry.id}`)
          .then((d) => {
            if (reqSeq === detailRequestSeq) journalDetail.value = d;
          })
          .catch(() => {})
      );
    } else if (entry.type === 'trip') {
      tasks.push(
        apiClient
          .get(`/api/v1/trips/${entry.id}`)
          .then((d) => {
            if (reqSeq === detailRequestSeq) tripDetail.value = d;
          })
          .catch(() => {})
      );
    }

    tasks.push(
      apiClient
        .get<EntryMediaDto[]>(`/api/v1/entries/${entry.id}/media`)
        .then((items) => {
          if (reqSeq === detailRequestSeq && Array.isArray(items)) {
            entryMediaList.value = items;
          }
        })
        .catch(() => {})
    );

    if (entry.coverMediaId) {
      tasks.push(
        apiClient
          .get<MediaAssetDto>(`/api/v1/media/${entry.coverMediaId}`)
          .then((asset) => {
            if (reqSeq === detailRequestSeq && asset) {
              coverAsset.value = asset;
            }
          })
          .catch(() => {})
      );
    }

    tasks.push(
      apiClient
        .getPaginated<CommentDto>(`/api/v1/entries/${entry.id}/comments`)
        .then((res) => {
          if (reqSeq === detailRequestSeq) comments.value = res.items;
        })
        .catch(() => {})
    );

    await Promise.all(tasks);
  } finally {
    if (reqSeq === detailRequestSeq) {
      isLoadingDetail.value = false;
      nextTick(() => {
        if (coverImgRef.value?.complete) {
          captureImageDimensions(coverImgRef.value);
        }
      });
    }
  }
}

async function handlePostComment() {
  if (!props.entry) return;
  const content = commentForm.value.content.trim();
  if (!content) return;
  isPostingComment.value = true;
  try {
    const authorName = commentForm.value.authorName.trim();
    const created = await apiClient.post<CommentDto>(
      `/api/v1/entries/${props.entry.id}/comments`,
      {
        ...(authorName ? { authorName } : {}),
        content,
      }
    );
    comments.value.unshift(created);
    commentForm.value.content = '';
    uiStore.notifySuccess('留言已发布');
  } catch (err: any) {
    uiStore.notifyError(err?.message || '留言发布失败');
  } finally {
    isPostingComment.value = false;
  }
}

async function handleMarkSpam(commentId: string) {
  try {
    await apiClient.put(`/api/v1/comments/${commentId}/status`, { status: 'spam' });
    comments.value = comments.value.filter((c) => c.id !== commentId);
    uiStore.notifyInfo('已隐藏该条留言');
  } catch (err: any) {
    uiStore.notifyError(err?.message || '操作失败');
  }
}

async function handleDeleteComment(commentId: string) {
  try {
    await apiClient.delete(`/api/v1/comments/${commentId}`);
    comments.value = comments.value.filter((c) => c.id !== commentId);
    uiStore.notifySuccess('留言已删除');
  } catch (err: any) {
    uiStore.notifyError(err?.message || '删除失败');
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (!props.modelValue || isLightboxOpen.value) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    close();
  }
}

watch(
  () => [props.modelValue, props.entry?.id],
  ([open]) => {
    if (open && props.entry) {
      document.body.style.overflow = 'hidden';
      loadDetails(props.entry);
      nextTick(() => {
        if (coverImgRef.value?.complete) {
          captureImageDimensions(coverImgRef.value);
        }
      });
    } else if (!open) {
      isLightboxOpen.value = false;
      document.body.style.overflow = '';
    }
  }
);

watch(isLightboxOpen, (open) => {
  if (!open && props.modelValue) {
    document.body.style.overflow = 'hidden';
  }
});

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  document.body.style.overflow = '';
});
</script>
