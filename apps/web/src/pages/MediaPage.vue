<template>
  <div class="gallery-reveal space-y-10 sm:space-y-12">
    <!-- ========================================================= -->
    <!-- MONUMENTAL EXHIBITION MASTHEAD                            -->
    <!-- ========================================================= -->
    <section class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-end pb-8 border-b border-[var(--rule)]">
      <div class="lg:col-span-7 space-y-3">
        <div class="flex items-center gap-3 kicker-caps text-[var(--seal)]">
          <span>CHAPTER II</span>
          <span class="w-6 h-[1px] bg-[var(--rule-strong)]"></span>
          <span class="text-[var(--ink-muted)]">EXHIBITION GALLERY · EXIF OPTICAL PLATES</span>
        </div>
        <div class="flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <h1 class="font-serif text-4xl sm:text-5xl lg:text-[54px] font-light tracking-[0.04em] text-[var(--ink)] leading-[1.12]">
            影像长廊
          </h1>
          <span class="font-display italic text-2xl sm:text-3xl font-light text-[var(--ink-dim)] tracking-wide">
            Planche photographique
          </span>
        </div>
      </div>

      <div class="lg:col-span-5 flex flex-col lg:items-end justify-between gap-4">
        <p class="font-serif text-[13.5px] sm:text-sm text-[var(--ink-secondary)] leading-[1.85] lg:text-right max-w-md font-light">
          定格于光影交织的瞬间，以自然画幅与无酸卡纸裱框呈列，保留真实光学参数与快门刻度。
        </p>

        <div class="flex flex-wrap items-center gap-4">
          <span
            v-if="isHeaderCountLoading"
            class="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-[var(--ink-dim)]"
            aria-live="polite"
          >
            <span class="inline-block h-3 w-16 rounded-[2px] bg-[var(--linen)] animate-pulse"></span>
            <span class="sr-only">正在显影展品数量</span>
          </span>
          <span v-else class="font-mono text-[11px] tracking-[0.14em] text-[var(--ink-muted)] tabular-nums">
            {{ headerCountLabel }}
          </span>
          <button
            v-if="authStore.isAdmin"
            type="button"
            class="inline-flex items-center gap-2 rounded-[2px] bg-[var(--ink)] px-4 py-2 text-xs font-serif tracking-[0.14em] text-[var(--alabaster)] hover:bg-[var(--seal)] transition-colors duration-200"
            @click="openUploader()"
          >
            <UploadCloudIcon class="w-3.5 h-3.5" />
            <span>直传印相</span>
          </button>
        </div>
      </div>
    </section>

    <!-- ========================================================= -->
    <!-- GALLERY CONTROL RAIL                                      -->
    <!-- ========================================================= -->
    <section class="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[var(--rule)]">
      <div class="flex flex-wrap items-end gap-6">
        <!-- Primary Gallery Mode Switcher: All Photos vs Travel Collections -->
        <div class="flex items-center gap-6">
          <button
            type="button"
            class="relative pb-3.5 text-[13px] font-serif tracking-[0.12em] transition-colors"
            :class="
              galleryMode === 'all'
                ? 'text-[var(--ink)] font-medium'
                : 'text-[var(--ink-secondary)] hover:text-[var(--ink)]'
            "
            @click="switchGalleryMode('all')"
          >
            <span>全部影像</span>
            <span
              class="absolute -bottom-[1px] inset-x-0 h-[1.5px] bg-[var(--seal)] transition-transform duration-300 ease-gallery origin-left"
              :class="galleryMode === 'all' ? 'scale-x-100' : 'scale-x-0'"
            ></span>
          </button>

          <button
            type="button"
            class="relative pb-3.5 inline-flex items-center gap-1.5 text-[13px] font-serif tracking-[0.12em] transition-colors"
            :class="
              galleryMode === 'collections'
                ? 'text-[var(--ink)] font-medium'
                : 'text-[var(--ink-secondary)] hover:text-[var(--ink)]'
            "
            @click="switchGalleryMode('collections')"
          >
            <span>旅行合集</span>
            <span
              v-if="collections.length > 0"
              class="font-mono text-[10px] text-[var(--ink-dim)] tabular-nums"
            >
              ({{ collections.length }})
            </span>
            <span
              class="absolute -bottom-[1px] inset-x-0 h-[1.5px] bg-[var(--seal)] transition-transform duration-300 ease-gallery origin-left"
              :class="galleryMode === 'collections' ? 'scale-x-100' : 'scale-x-0'"
            ></span>
          </button>
        </div>

        <!-- Admin Visibility Sub-Tabs in All Mode -->
        <template v-if="galleryMode === 'all' && authStore.isAdmin">
          <span class="hidden sm:inline-block h-3.5 w-[1px] bg-[var(--rule)] mb-3.5"></span>
          <div class="flex items-center gap-5">
            <button
              v-for="tab in visibilityTabs"
              :key="tab.value"
              type="button"
              class="relative pb-3.5 text-[12px] font-serif tracking-[0.1em] transition-colors"
              :class="
                visibilityFilter === tab.value
                  ? 'text-[var(--seal)] font-medium'
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
              "
              @click="changeVisibilityFilter(tab.value)"
            >
              <span>{{ tab.label }}</span>
            </button>
          </div>
        </template>

        <!-- Admin Create Collection Trigger on Collections Index -->
        <template v-if="galleryMode === 'collections' && !activeCollectionSlug && authStore.isAdmin">
          <span class="hidden sm:inline-block h-3.5 w-[1px] bg-[var(--rule)] mb-3.5"></span>
          <button
            type="button"
            class="mb-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-[2px] border border-[var(--rule-strong)] text-[11px] font-serif text-[var(--ink)] hover:border-[var(--seal)] hover:text-[var(--seal)] transition-colors"
            @click="showNewCollectionModal = !showNewCollectionModal"
          >
            <FolderPlusIcon class="w-3.5 h-3.5" />
            <span>{{ showNewCollectionModal ? '收起新建' : '新建旅行合集' }}</span>
          </button>
        </template>
      </div>

      <div class="flex flex-wrap items-center gap-5 pb-3">
        <div class="relative flex items-center">
          <SearchIcon class="w-3.5 h-3.5 text-[var(--ink-muted)] pointer-events-none mr-2" />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="isCollectionsIndexView ? '检索合集名称或行程...' : '检索片名或相机机型...'"
            class="w-44 sm:w-52 bg-transparent border-b border-[var(--rule-strong)] focus:border-[var(--ink)] pb-1 text-xs text-[var(--ink)] placeholder-[var(--ink-muted)] focus:outline-none transition-colors"
          />
        </div>

        <div
          v-if="!isCollectionsIndexView"
          class="inline-flex items-center border border-[var(--rule)] rounded-[2px] bg-[var(--alabaster)]/80 text-[11px] font-serif tracking-[0.12em]"
        >
          <button
            type="button"
            class="px-3 py-1 transition-colors"
            :class="wallMode === 'masonry' ? 'bg-[var(--ink)] text-[var(--alabaster)]' : 'text-[var(--ink-secondary)] hover:text-[var(--ink)]'"
            @click="wallMode = 'masonry'"
          >
            画幅墙
          </button>
          <button
            type="button"
            class="px-3 py-1 border-l border-[var(--rule)] transition-colors"
            :class="wallMode === 'grid' ? 'bg-[var(--ink)] text-[var(--alabaster)]' : 'text-[var(--ink-secondary)] hover:text-[var(--ink)]'"
            @click="wallMode = 'grid'"
          >
            接触表
          </button>
        </div>
      </div>
    </section>

    <!-- Inline Admin New Collection Panel -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <form
        v-if="authStore.isAdmin && galleryMode === 'collections' && !activeCollectionSlug && showNewCollectionModal"
        @submit.prevent="handleCreateCollection"
        class="passe-partout rounded-[2px] p-5 sm:p-6 space-y-4"
      >
        <div class="flex items-center justify-between border-b border-[var(--rule)] pb-3">
          <div>
            <span class="kicker-caps text-[var(--seal)] block">NEW TRAVEL EXHIBITION</span>
            <h3 class="font-serif text-base text-[var(--ink)] mt-0.5">创建旅行影像合集</h3>
          </div>
          <button
            type="button"
            class="text-xs font-serif text-[var(--ink-muted)] hover:text-[var(--ink)]"
            @click="showNewCollectionModal = false"
          >
            取消
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <input
            v-model="newCollectionForm.title"
            type="text"
            required
            maxlength="200"
            placeholder="合集标题 *（如：青海湖）"
            class="editorial-field px-3 py-2"
          />
          <input
            v-model="newCollectionForm.occurredRange"
            type="text"
            maxlength="100"
            placeholder="时间与地标（如：2026-07 · 青海湖）"
            class="editorial-field px-3 py-2"
          />
          <select v-model="newCollectionForm.visibility" class="editorial-field px-3 py-2 font-serif">
            <option value="public">公开特展（访客可见）</option>
            <option value="private">私密典藏（仅馆主可见）</option>
          </select>
        </div>

        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            v-model="newCollectionForm.description"
            type="text"
            maxlength="1000"
            placeholder="展陈引言或旅途简记（可选）"
            class="flex-1 editorial-field px-3 py-2 text-xs"
          />
          <button
            type="submit"
            :disabled="isCreatingCollection || !newCollectionForm.title.trim()"
            class="inline-flex items-center justify-center gap-2 rounded-[2px] bg-[var(--ink)] px-5 py-2 text-xs font-serif tracking-[0.12em] text-[var(--alabaster)] hover:bg-[var(--seal)] transition-colors disabled:opacity-40 shrink-0"
          >
            <Loader2Icon v-if="isCreatingCollection" class="w-3.5 h-3.5 animate-spin" />
            <span>创建合集</span>
          </button>
        </div>
      </form>
    </Transition>

    <!-- ========================================================= -->
    <!-- COLLECTION EXHIBITION BANNER (When Inside a Collection)   -->
    <!-- ========================================================= -->
    <section
      v-if="galleryMode === 'collections' && activeCollectionSlug"
      class="passe-partout rounded-[2px] p-5 sm:p-7 space-y-4"
    >
      <div class="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          class="inline-flex items-center gap-2 text-xs font-serif tracking-[0.1em] text-[var(--ink-secondary)] hover:text-[var(--seal)] transition-colors"
          @click="backToCollections"
        >
          <ArrowLeftIcon class="w-3.5 h-3.5" />
          <span>返回旅行合集</span>
        </button>

        <div class="flex flex-wrap items-center gap-3">
          <span
            v-if="activeCollectionDetail?.collection.visibility === 'private'"
            class="px-2 py-0.5 rounded-[2px] border border-[#9A6B2F]/40 bg-[#9A6B2F]/10 text-[10px] font-mono tracking-[0.15em] text-[#9A6B2F]"
          >
            PRIVATE COLLECTION
          </span>
          <button
            v-if="authStore.isAdmin && activeCollectionDetail"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-[2px] border border-[var(--rule-strong)] px-3 py-1.5 text-xs font-serif text-[var(--ink)] hover:border-[var(--seal)] hover:text-[var(--seal)] transition-colors"
            @click="openUploader(activeCollectionDetail.collection.id)"
          >
            <UploadCloudIcon class="w-3.5 h-3.5" />
            <span>上传至此合集</span>
          </button>
        </div>
      </div>

      <div v-if="activeCollectionDetail" class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
        <div class="lg:col-span-8 space-y-2">
          <div class="flex flex-wrap items-center gap-2.5 kicker-caps text-[var(--seal)]">
            <span>TRAVEL MONOGRAPH</span>
            <template v-if="activeCollectionDetail.collection.occurredRange">
              <span class="text-[var(--rule-strong)]">/</span>
              <span class="text-[var(--ink-muted)]">{{ activeCollectionDetail.collection.occurredRange }}</span>
            </template>
          </div>
          <h2 class="font-serif text-2xl sm:text-3xl font-light tracking-[0.04em] text-[var(--ink)]">
            {{ activeCollectionDetail.collection.title }}
          </h2>
          <p
            v-if="activeCollectionDetail.collection.description"
            class="font-serif text-xs sm:text-[13.5px] text-[var(--ink-secondary)] leading-[1.85] max-w-2xl font-light"
          >
            {{ activeCollectionDetail.collection.description }}
          </p>
        </div>
        <div class="lg:col-span-4 lg:text-right font-mono text-[11px] tracking-[0.14em] text-[var(--ink-muted)] tabular-nums">
          收录 {{ activeCollectionDetail.items.length }} 幅特展印相 · 点击卡片左下批注可留影
        </div>
      </div>
    </section>

    <!-- ========================================================= -->
    <!-- GALLERY BODY WITH SMOOTH STATE TRANSITION                 -->
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
      <!-- 1. COLLECTIONS INDEX LOADING -->
      <div
        v-if="isCollectionsIndexView && isLoadingCollections"
        key="collections-loading"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 lg:gap-8"
      >
        <div
          v-for="i in 3"
          :key="i"
          class="passe-partout rounded-[2px] p-4 animate-pulse space-y-4"
        >
          <div class="w-full aspect-[4/3] bg-[var(--linen)]"></div>
          <div class="h-3 w-1/3 bg-[var(--linen)]"></div>
          <div class="h-5 w-2/3 bg-[var(--linen)]"></div>
          <div class="h-3 w-4/5 bg-[var(--linen)]/70"></div>
        </div>
      </div>

      <!-- 2. COLLECTIONS INDEX EMPTY -->
      <div
        v-else-if="isCollectionsIndexView && filteredCollections.length === 0"
        key="collections-empty"
        class="py-24 sm:py-32 px-6 text-center flex flex-col items-center justify-center border-y border-[var(--rule)] bg-[var(--alabaster)]/55"
      >
        <div class="w-[1px] h-10 bg-[var(--rule-strong)] mb-6"></div>
        <div class="relative w-12 h-9 flex items-center justify-center mb-6 border border-[var(--rule-strong)]">
          <ImagesIcon class="w-4 h-4 text-[var(--ink-dim)]" />
        </div>
        <p class="font-display italic text-lg text-[var(--ink-dim)] tracking-wide">
          {{ searchQuery ? 'No Collections Matched' : 'Travel Monographs Pending' }}
        </p>
        <h3 class="mt-2 font-serif text-2xl font-light tracking-[0.08em] text-[var(--ink)]">
          {{ searchQuery ? '未检索到匹配的旅行合集' : '旅行合集特展尚待启幕' }}
        </h3>
        <p class="mt-3 text-xs text-[var(--ink-muted)] max-w-sm leading-[1.9] font-light">
          {{
            searchQuery
              ? '可尝试更换合集名称或行程关键词。'
              : '管理员可在上方新建旅行合集，并在批量直传照片时一键归集生成瀑布流特展长卷。'
          }}
        </p>
        <button
          v-if="authStore.isAdmin && !searchQuery"
          type="button"
          class="mt-8 inline-flex items-center gap-2 rounded-[2px] bg-[var(--ink)] px-5 py-2.5 text-xs font-serif tracking-[0.16em] text-[var(--alabaster)] hover:bg-[var(--seal)] transition-colors"
          @click="showNewCollectionModal = true"
        >
          <FolderPlusIcon class="w-3.5 h-3.5" />
          <span>创建首卷旅行合集</span>
        </button>
      </div>

      <!-- 3. COLLECTIONS INDEX GRID -->
      <div
        v-else-if="isCollectionsIndexView"
        key="collections-grid"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 lg:gap-8"
      >
        <article
          v-for="col in filteredCollections"
          :key="col.id"
          class="group passe-partout rounded-[2px] p-4 cursor-pointer transition-[transform,border-color,box-shadow] duration-500 ease-gallery hover:border-[var(--rule-strong)] hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-28px_rgba(22,21,19,0.24)] flex flex-col"
          @click="openCollection(col.slug)"
        >
          <div class="relative aspect-[4/3] overflow-hidden bg-[var(--linen)]">
            <img
              v-if="col.coverThumbUrl || col.coverUrl"
              :src="col.coverThumbUrl || col.coverUrl || ''"
              :alt="col.title"
              loading="lazy"
              decoding="async"
              class="w-full h-full object-cover transition-transform duration-700 ease-gallery group-hover:scale-[1.03]"
            />
            <div v-else class="w-full h-full flex flex-col items-center justify-center gap-2 text-[var(--ink-dim)]">
              <ImagesIcon class="w-7 h-7 stroke-[1.25]" />
              <span class="kicker-caps">EXHIBITION ROLL</span>
            </div>

            <span
              v-if="col.visibility === 'private'"
              class="absolute top-3 left-3 bg-[#11100F]/80 text-[#E5C58E] px-2 py-0.5 text-[9px] font-mono tracking-[0.18em] uppercase border border-[#E5C58E]/30"
            >
              PRIVATE
            </span>
          </div>

          <div class="pt-4 flex-1 flex flex-col justify-between gap-3">
            <div class="space-y-1.5">
              <div class="flex items-center justify-between gap-2 kicker-caps text-[var(--seal)]">
                <span class="truncate">{{ col.occurredRange || 'CURATED COLLECTION' }}</span>
                <span class="font-mono text-[10px] text-[var(--ink-muted)] shrink-0 tabular-nums">
                  {{ col.mediaCount ?? 0 }} 帧
                </span>
              </div>
              <h3 class="font-serif text-xl font-normal text-[var(--ink)] group-hover:text-[var(--seal)] transition-colors">
                {{ col.title }}
              </h3>
              <p
                v-if="col.description"
                class="font-serif text-xs text-[var(--ink-secondary)] leading-[1.8] line-clamp-2 font-light"
              >
                {{ col.description }}
              </p>
            </div>

            <div class="pt-3 border-t border-[var(--rule)] flex items-center justify-between text-[11px] font-serif text-[var(--ink-muted)] group-hover:text-[var(--ink)] transition-colors">
              <span>进入特展瀑布流</span>
              <span class="font-mono transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
            </div>
          </div>
        </article>
      </div>

      <!-- 4. PHOTO WALL LOADING SKELETONS (All Mode or Collection Detail) -->
      <div
        v-else-if="isPhotoWallLoading"
        key="loading"
        :class="
          wallMode === 'masonry'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7 lg:gap-9'
            : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-7'
        "
      >
        <div
          v-for="i in 6"
          :key="i"
          class="passe-partout rounded-[2px] p-3.5 sm:p-4 animate-pulse space-y-3.5"
        >
          <div
            class="w-full bg-[var(--linen)]"
            :class="wallMode === 'grid' ? 'aspect-[4/3]' : i % 2 === 0 ? 'aspect-[4/5]' : 'aspect-[4/3]'"
          ></div>
          <div class="flex justify-between pt-0.5">
            <div class="h-3 bg-[var(--linen)] w-1/3"></div>
            <div class="h-3 bg-[var(--linen)] w-1/5"></div>
          </div>
        </div>
      </div>

      <!-- 5. COLLECTION LOAD ERROR / NOT FOUND -->
      <div
        v-else-if="galleryMode === 'collections' && activeCollectionSlug && collectionError"
        key="collection-error"
        class="py-24 px-6 text-center flex flex-col items-center justify-center border-y border-[var(--rule)] bg-[var(--alabaster)]/55"
      >
        <p class="font-display italic text-lg text-[var(--ink-dim)]">Collection Unavailable</p>
        <h3 class="mt-2 font-serif text-xl text-[var(--ink)]">{{ collectionError }}</h3>
        <button
          type="button"
          class="mt-6 rounded-[2px] border border-[var(--ink)] px-5 py-2 text-xs font-serif tracking-[0.14em] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--alabaster)] transition-colors"
          @click="backToCollections"
        >
          返回旅行合集
        </button>
      </div>

      <!-- 6. SERENE MUSEUM EMPTY STATE (Photo Wall) -->
      <div
        v-else-if="displayedPhotos.length === 0"
        key="empty"
        class="py-24 sm:py-32 px-6 text-center flex flex-col items-center justify-center border-y border-[var(--rule)] bg-[var(--alabaster)]/55"
      >
        <div class="w-[1px] h-10 bg-[var(--rule-strong)] mb-6"></div>
        <div class="relative w-12 h-9 flex items-center justify-center mb-6 border border-[var(--rule-strong)]">
          <span class="w-6 h-4 border border-[var(--rule)]"></span>
        </div>
        <p class="font-display italic text-lg text-[var(--ink-dim)] tracking-wide">
          {{ searchQuery ? 'No Plates Matched' : 'Gallery Wall Unhung' }}
        </p>
        <h3 class="mt-2 font-serif text-2xl font-light tracking-[0.08em] text-[var(--ink)]">
          {{ searchQuery ? '未检索到匹配的影像印相' : activeCollectionSlug ? '本卷合集尚待装帧影像' : '展墙尚待悬画' }}
        </h3>
        <p class="mt-3 text-xs text-[var(--ink-muted)] max-w-sm leading-[1.9] font-light">
          {{
            searchQuery
              ? '可尝试更换相机机型或标题关键词。'
              : activeCollectionSlug
              ? '管理员可点击右上「上传至此合集」，批量拖入照片并自动压缩保留 EXIF。'
              : '影像长廊目前虚位以待，管理员可直传高保真 WebP 摄影作品并自动保留 EXIF 光学信息。'
          }}
        </p>
        <button
          v-if="authStore.isAdmin && !searchQuery"
          type="button"
          class="mt-8 inline-flex items-center gap-2 rounded-[2px] bg-[var(--ink)] px-5 py-2.5 text-xs font-serif tracking-[0.16em] text-[var(--alabaster)] hover:bg-[var(--seal)] transition-colors"
          @click="openUploader(activeCollectionDetail?.collection.id)"
        >
          <UploadCloudIcon class="w-3.5 h-3.5" />
          <span>{{ activeCollectionSlug ? '上传至本合集' : '悬置首幅影像' }}</span>
        </button>
      </div>

      <!-- 7. MUSEUM EXHIBITION WALL (True Aspect Ratio Masonry / Grid) -->
      <div v-else key="wall" class="space-y-10">
        <div
          :class="
            wallMode === 'masonry'
              ? 'columns-1 sm:columns-2 lg:columns-3 gap-7 lg:gap-9 space-y-7 lg:space-y-9'
              : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-7'
          "
        >
          <figure
            v-for="(photo, index) in displayedPhotos"
            :key="photo.id"
            class="group break-inside-avoid passe-partout rounded-[2px] p-3.5 sm:p-4 cursor-pointer transition-[transform,border-color,box-shadow] duration-500 ease-gallery hover:border-[var(--rule-strong)] hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-28px_rgba(22,21,19,0.24)]"
            @click="openLightbox(index)"
          >
            <!-- Framed Photograph -->
            <div
              class="relative overflow-hidden bg-[var(--linen)]"
              :class="wallMode === 'grid' ? 'aspect-[4/3]' : ''"
              :style="getPhotoFrameStyle(photo)"
            >
              <img
                :src="photo.thumbUrl || photo.url"
                :alt="photo.title || '画廊照片'"
                loading="lazy"
                decoding="async"
                class="w-full block transition-transform duration-700 ease-gallery group-hover:scale-[1.03]"
                :class="wallMode === 'grid' || (photo.width && photo.height) ? 'h-full object-cover' : 'h-auto object-cover'"
              />

              <!-- Darkroom Hover Scrim & EXIF Optical Line -->
              <div
                class="absolute inset-0 bg-gradient-to-t from-[#11100F]/88 via-[#11100F]/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3"
              >
                <!-- Top Actions -->
                <div class="flex items-center justify-between gap-2">
                  <span
                    v-if="photo.visibility === 'private'"
                    class="bg-[#11100F]/80 text-[#E5C58E] px-2 py-0.5 text-[9px] font-mono tracking-[0.18em] uppercase border border-[#E5C58E]/30"
                  >
                    PRIVATE
                  </span>
                  <button
                    v-if="authStore.isAdmin"
                    type="button"
                    class="ml-auto p-1.5 bg-[#11100F]/75 text-[#FAF8F4]/80 hover:bg-[#9A3F2B] hover:text-white transition-colors"
                    @click.stop="handleDeleteMedia(photo.id)"
                    title="删除照片"
                  >
                    <Trash2Icon class="w-3.5 h-3.5" />
                  </button>
                </div>

                <!-- Bottom Optical Spec Readout -->
                <div class="flex items-center justify-between gap-2 text-[10px] font-mono tracking-[0.12em] text-[#FAF8F4]/90">
                  <span class="truncate">
                    {{ photo.exif?.model || 'OPTICAL PRINT' }}
                  </span>
                  <span class="shrink-0 text-[#E2A998] tabular-nums">
                    <template v-if="photo.exif?.focalLength">{{ photo.exif.focalLength }}mm</template>
                    <template v-if="photo.exif?.fNumber"> · f/{{ photo.exif.fNumber }}</template>
                    <template v-if="photo.exif?.iso"> · ISO {{ photo.exif.iso }}</template>
                  </span>
                </div>
              </div>
            </div>

            <!-- Museum Wall Placard Below Print (with non-occluding Comment Badge) -->
            <figcaption class="pt-3.5 px-0.5 flex items-center justify-between gap-2.5">
              <div class="min-w-0 flex items-baseline gap-2">
                <span class="font-display italic text-sm text-[var(--ink-dim)] shrink-0 tabular-nums">
                  Pl. {{ String(index + 1).padStart(2, '0') }}
                </span>
                <span class="font-serif text-[13px] text-[var(--ink)] group-hover:text-[var(--seal)] transition-colors truncate">
                  {{ photo.title || '无题印相' }}
                </span>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  data-testid="photo-comment-trigger"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] border border-[var(--rule)] bg-[var(--canvas)]/70 text-[10px] font-mono text-[var(--ink-muted)] hover:border-[var(--seal)] hover:text-[var(--seal)] transition-colors tabular-nums"
                  @click.stop="openCommentDrawer(photo)"
                  :title="`查看或发表「${photo.title || '此照片'}」的单图批注`"
                  aria-label="查看或发表单图批注"
                >
                  <MessageSquareIcon class="w-3 h-3" />
                  <span>{{ formatCommentBadge(photo.commentCount) }}</span>
                </button>
                <span class="hidden sm:inline font-mono text-[10px] tracking-[0.08em] text-[var(--ink-dim)] tabular-nums">
                  {{ formatOccurredAt(photo.occurredAt) }}
                </span>
              </div>
            </figcaption>
          </figure>
        </div>

        <!-- Pagination (All Photos Mode) -->
        <div v-if="galleryMode === 'all' && hasMore" class="pt-6 text-center">
          <button
            type="button"
            :disabled="isLoadingMore"
            class="inline-flex items-center gap-3 px-8 py-3 rounded-[2px] border border-[var(--ink)] text-xs font-serif tracking-[0.18em] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--alabaster)] transition-colors duration-200 disabled:opacity-40"
            @click="loadGalleryPhotos(false)"
          >
            <Loader2Icon v-if="isLoadingMore" class="w-3.5 h-3.5 animate-spin" />
            <span>{{ isLoadingMore ? '正在显影更多印相...' : '展开更多馆藏影像' }}</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- Single-Photo Side / Bottom Comment & EXIF Drawer (M3-4) -->
    <PhotoCommentDrawer
      v-model="isCommentDrawerOpen"
      :photo="activeCommentPhoto"
      @open-lightbox="handleOpenLightboxFromDrawer"
      @comment-added="handleCommentAdded"
      @comment-deleted="handleCommentDeleted"
    />

    <!-- Fullscreen Darkroom Viewing Room -->
    <MediaLightbox
      v-model="isLightboxOpen"
      :items="lightboxItems"
      :initial-index="lightboxIndex"
      :can-delete="authStore.isAdmin"
      @delete="handleDeleteMedia"
    />

    <!-- Multi-file Upload Drawer/Modal -->
    <MediaUploader
      v-model="isUploaderOpen"
      :default-collection-id="uploaderDefaultCollectionId"
      @uploaded="handleUploadSuccess"
      @collection-updated="handleCollectionUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  UploadCloud as UploadCloudIcon,
  Search as SearchIcon,
  Trash2 as Trash2Icon,
  Loader2 as Loader2Icon,
  MessageSquare as MessageSquareIcon,
  FolderPlus as FolderPlusIcon,
  ArrowLeft as ArrowLeftIcon,
  Images as ImagesIcon,
} from 'lucide-vue-next';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { useUiStore } from '@/shared/stores/ui.store';
import { apiClient } from '@/shared/api/client';
import MediaLightbox, { type LightboxItem } from '@/features/media/components/MediaLightbox.vue';
import MediaUploader from '@/features/media/components/MediaUploader.vue';
import PhotoCommentDrawer from '@/features/media/components/PhotoCommentDrawer.vue';
import type {
  MediaAssetDto,
  MediaCollectionDto,
  MediaCollectionDetailDto,
  CollectionMediaAssetDto,
} from '@archive/contracts';
import { formatDate } from '@archive/shared';

interface GalleryPhotoItem extends LightboxItem {
  commentCount?: number;
}

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const uiStore = useUiStore();

const visibilityTabs = [
  { label: '全部印相', value: 'all' },
  { label: '公开策展', value: 'public' },
  { label: '私密典藏', value: 'private' },
] as const;

const galleryMode = ref<'all' | 'collections'>('all');
const wallMode = ref<'masonry' | 'grid'>('masonry');
const isLoading = ref(true);
const isLoadingMore = ref(false);
const photos = ref<GalleryPhotoItem[]>([]);
const nextCursor = ref<string | null>(null);
const hasMore = ref(false);
const searchQuery = ref('');
const visibilityFilter = ref<'all' | 'public' | 'private'>('all');

// Collections State (M3-3)
const collections = ref<MediaCollectionDto[]>([]);
const isLoadingCollections = ref(false);
const activeCollectionSlug = ref<string | null>(null);
const activeCollectionDetail = ref<MediaCollectionDetailDto | null>(null);
const isLoadingCollectionDetail = ref(false);
const collectionError = ref<string | null>(null);

// Quick New Collection Panel on Collections Index
const showNewCollectionModal = ref(false);
const isCreatingCollection = ref(false);
const newCollectionForm = ref({
  title: '',
  occurredRange: '',
  description: '',
  visibility: 'public' as 'public' | 'private',
});

// Single-Photo Comment Drawer State (M3-4)
const isCommentDrawerOpen = ref(false);
const activeCommentPhoto = ref<GalleryPhotoItem | null>(null);
const localCommentCounts = ref<Record<string, number>>({});

// Lightbox & Uploader State
const isLightboxOpen = ref(false);
const lightboxIndex = ref(0);
const isUploaderOpen = ref(false);
const uploaderDefaultCollectionId = ref<string | undefined>(undefined);

const isCollectionsIndexView = computed(
  () => galleryMode.value === 'collections' && !activeCollectionSlug.value
);

const isPhotoWallLoading = computed(() =>
  galleryMode.value === 'collections' ? isLoadingCollectionDetail.value : isLoading.value
);

const isHeaderCountLoading = computed(() => {
  if (isCollectionsIndexView.value) return isLoadingCollections.value;
  if (galleryMode.value === 'collections') return isLoadingCollectionDetail.value;
  return isLoading.value;
});

function filterPhotosList(list: GalleryPhotoItem[]): GalleryPhotoItem[] {
  if (!searchQuery.value.trim()) return list;
  const q = searchQuery.value.trim().toLowerCase();
  return list.filter((p) => {
    const matchTitle = (p.title || '').toLowerCase().includes(q);
    const matchModel = (p.exif?.model || '').toLowerCase().includes(q);
    const matchMake = (p.exif?.make || '').toLowerCase().includes(q);
    return matchTitle || matchModel || matchMake;
  });
}

const filteredPhotos = computed(() => filterPhotosList(photos.value));

const collectionPhotos = computed<GalleryPhotoItem[]>(() => {
  if (!activeCollectionDetail.value) return [];
  return activeCollectionDetail.value.items.map(mapCollectionAssetToItem);
});

const filteredCollectionPhotos = computed(() => filterPhotosList(collectionPhotos.value));

const displayedPhotos = computed(() =>
  galleryMode.value === 'collections' ? filteredCollectionPhotos.value : filteredPhotos.value
);

const filteredCollections = computed(() => {
  if (!searchQuery.value.trim()) return collections.value;
  const q = searchQuery.value.trim().toLowerCase();
  return collections.value.filter((col) => {
    const matchTitle = col.title.toLowerCase().includes(q);
    const matchRange = (col.occurredRange || '').toLowerCase().includes(q);
    const matchDesc = (col.description || '').toLowerCase().includes(q);
    return matchTitle || matchRange || matchDesc;
  });
});

const headerCountLabel = computed(() => {
  if (isCollectionsIndexView.value) {
    return `${filteredCollections.value.length} 卷旅行合集`;
  }
  return `${displayedPhotos.value.length} 幅印相`;
});

const lightboxItems = computed(() => displayedPhotos.value);

let activeLoadToken = 0;
let activeCollectionToken = 0;
let activeCollectionDetailToken = 0;

function getPhotoFrameStyle(photo: LightboxItem): Record<string, string> | undefined {
  if (wallMode.value !== 'masonry') return undefined;
  if (photo.width && photo.height && photo.width > 0 && photo.height > 0) {
    return { aspectRatio: `${photo.width} / ${photo.height}` };
  }
  return undefined;
}

function formatOccurredAt(ts?: number): string {
  if (!ts) return '';
  return formatDate(ts, '.');
}

function formatCommentBadge(count?: number): string {
  if (typeof count === 'number' && count > 0) {
    return String(count);
  }
  return '批注';
}

function mapAssetToLightboxItem(asset: MediaAssetDto): GalleryPhotoItem {
  const title = asset.originalFilename
    ? asset.originalFilename.replace(/\.[^/.]+$/, '')
    : '影像切片';
  return {
    id: asset.id,
    title,
    url: asset.originalUrl || asset.thumbUrl || '',
    thumbUrl: asset.thumbUrl || asset.originalUrl || '',
    width: asset.width,
    height: asset.height,
    sizeBytes: asset.sizeBytes,
    mimeType: asset.mimeType,
    occurredAt: asset.createdAt,
    visibility: asset.visibility,
    exif: asset.exif ?? undefined,
    commentCount: localCommentCounts.value[asset.id],
  };
}

function mapCollectionAssetToItem(asset: CollectionMediaAssetDto): GalleryPhotoItem {
  const base = mapAssetToLightboxItem(asset);
  const overrideCount = localCommentCounts.value[asset.id];
  return {
    ...base,
    commentCount: typeof overrideCount === 'number' ? overrideCount : asset.commentCount,
  };
}

function openLightbox(index: number) {
  lightboxIndex.value = index;
  isLightboxOpen.value = true;
}

function openCommentDrawer(photo: GalleryPhotoItem) {
  activeCommentPhoto.value = photo;
  isCommentDrawerOpen.value = true;
}

function handleOpenLightboxFromDrawer(mediaId: string) {
  const idx = displayedPhotos.value.findIndex((p) => p.id === mediaId);
  if (idx !== -1) {
    openLightbox(idx);
  }
}

function updatePhotoCommentCount(mediaId: string, delta: number) {
  const existingCollectionItem = activeCollectionDetail.value?.items.find((i) => i.id === mediaId);
  const existingPhotoItem = photos.value.find((p) => p.id === mediaId);
  const baseCount =
    localCommentCounts.value[mediaId] ??
    existingCollectionItem?.commentCount ??
    existingPhotoItem?.commentCount ??
    0;
  const nextCount = Math.max(0, baseCount + delta);

  localCommentCounts.value = {
    ...localCommentCounts.value,
    [mediaId]: nextCount,
  };

  if (existingCollectionItem) {
    existingCollectionItem.commentCount = nextCount;
  }
  if (existingPhotoItem) {
    existingPhotoItem.commentCount = nextCount;
  }
  if (activeCommentPhoto.value?.id === mediaId) {
    activeCommentPhoto.value = {
      ...activeCommentPhoto.value,
      commentCount: nextCount,
    };
  }
}

function handleCommentAdded(payload: { mediaId: string }) {
  updatePhotoCommentCount(payload.mediaId, 1);
}

function handleCommentDeleted(payload: { mediaId: string }) {
  updatePhotoCommentCount(payload.mediaId, -1);
}

function openUploader(collectionId?: string) {
  uploaderDefaultCollectionId.value = collectionId;
  isUploaderOpen.value = true;
}

function getRouteCollectionSlug(): string | null {
  const paramSlug = typeof route.params.slug === 'string' ? route.params.slug.trim() : '';
  if (paramSlug) return paramSlug;
  const querySlug = typeof route.query.collection === 'string' ? route.query.collection.trim() : '';
  return querySlug || null;
}

function navigateToCollectionUrl(slug: string) {
  const targetPath = `/media/collections/${encodeURIComponent(slug)}`;
  const resolved = router.resolve(targetPath);
  const supportsCollectionRoute =
    resolved.matched.length > 0 && resolved.matched.every((r) => r.name !== 'not-found');

  if (supportsCollectionRoute) {
    if (route.path !== targetPath) {
      router.push(targetPath);
    }
  } else if (route.query.collection !== slug) {
    router.push({ path: '/media', query: { collection: slug } });
  }
}

function clearCollectionUrl() {
  if (route.path !== '/media' || route.query.collection) {
    router.push({ path: '/media' });
  }
}

function switchGalleryMode(mode: 'all' | 'collections') {
  if (mode === 'all') {
    galleryMode.value = 'all';
    activeCollectionSlug.value = null;
    activeCollectionDetail.value = null;
    collectionError.value = null;
    searchQuery.value = '';
    clearCollectionUrl();
    if (photos.value.length === 0) {
      loadGalleryPhotos(true);
    }
  } else {
    galleryMode.value = 'collections';
    activeCollectionSlug.value = null;
    activeCollectionDetail.value = null;
    collectionError.value = null;
    searchQuery.value = '';
    clearCollectionUrl();
    loadCollections();
  }
}

function openCollection(slug: string) {
  galleryMode.value = 'collections';
  activeCollectionSlug.value = slug;
  searchQuery.value = '';
  navigateToCollectionUrl(slug);
  loadCollectionDetail(slug);
}

function backToCollections() {
  galleryMode.value = 'collections';
  activeCollectionSlug.value = null;
  activeCollectionDetail.value = null;
  collectionError.value = null;
  searchQuery.value = '';
  clearCollectionUrl();
  if (collections.value.length === 0) {
    loadCollections();
  }
}

function changeVisibilityFilter(val: 'all' | 'public' | 'private') {
  visibilityFilter.value = val;
  loadGalleryPhotos(true);
}

async function loadGalleryPhotos(reset: boolean = true) {
  if (!reset && (isLoading.value || isLoadingMore.value)) {
    return;
  }

  const requestToken = ++activeLoadToken;
  if (reset) {
    isLoading.value = true;
    nextCursor.value = null;
  } else {
    isLoadingMore.value = true;
  }

  try {
    const params: Record<string, string | number> = {
      mediaType: 'image',
      limit: 40,
    };
    if (authStore.isAdmin && visibilityFilter.value !== 'all') {
      params.visibility = visibilityFilter.value;
    }
    if (!reset && nextCursor.value) {
      params.cursor = nextCursor.value;
    }

    const res = await apiClient.getPaginated<MediaAssetDto>('/api/v1/media', { params });
    if (requestToken !== activeLoadToken) return;

    const mapped = res.items.map(mapAssetToLightboxItem);

    if (reset) {
      photos.value = mapped;
    } else {
      photos.value = [...photos.value, ...mapped];
    }

    nextCursor.value = res.pagination.cursor;
    hasMore.value = res.pagination.hasMore;
  } catch (err: any) {
    if (requestToken !== activeLoadToken) return;
    uiStore.notifyError(err?.message || '加载影像长廊失败');
  } finally {
    if (requestToken === activeLoadToken) {
      isLoading.value = false;
      isLoadingMore.value = false;
    }
  }
}

async function loadCollections() {
  const token = ++activeCollectionToken;
  isLoadingCollections.value = true;
  try {
    const result = await apiClient.listCollections();
    if (token !== activeCollectionToken) return;
    collections.value = result;
  } catch (err: any) {
    if (token !== activeCollectionToken) return;
    uiStore.notifyError(err?.message || '加载旅行合集失败');
  } finally {
    if (token === activeCollectionToken) {
      isLoadingCollections.value = false;
    }
  }
}

async function loadCollectionDetail(slug: string) {
  const token = ++activeCollectionDetailToken;
  isLoadingCollectionDetail.value = true;
  collectionError.value = null;
  try {
    const detail = await apiClient.getCollectionMedia(slug);
    if (token !== activeCollectionDetailToken) return;
    activeCollectionDetail.value = detail;
  } catch (err: any) {
    if (token !== activeCollectionDetailToken) return;
    activeCollectionDetail.value = null;
    collectionError.value = err?.message || '未能读取该旅行合集';
  } finally {
    if (token === activeCollectionDetailToken) {
      isLoadingCollectionDetail.value = false;
    }
  }
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
      visibility: newCollectionForm.value.visibility,
    });
    collections.value = [created, ...collections.value];
    newCollectionForm.value = {
      title: '',
      occurredRange: '',
      description: '',
      visibility: 'public',
    };
    showNewCollectionModal.value = false;
    uiStore.notifySuccess(`已创建旅行合集「${created.title}」`);
  } catch (err: any) {
    uiStore.notifyError(err?.message || '创建合集失败');
  } finally {
    isCreatingCollection.value = false;
  }
}

async function handleDeleteMedia(id: string) {
  const ok = await uiStore.confirm({
    title: '删除影像资产',
    message: '确定要删除这张照片吗？删除后将不再在长廊中展示。',
    confirmLabel: '确认删除',
    danger: true,
  });
  if (!ok) return;

  try {
    await apiClient.delete(`/api/v1/media/${id}`);
    photos.value = photos.value.filter((p) => p.id !== id);
    if (activeCollectionDetail.value) {
      activeCollectionDetail.value = {
        ...activeCollectionDetail.value,
        items: activeCollectionDetail.value.items.filter((i) => i.id !== id),
      };
    }
    if (activeCommentPhoto.value?.id === id) {
      isCommentDrawerOpen.value = false;
      activeCommentPhoto.value = null;
    }
    if (displayedPhotos.value.length === 0) {
      isLightboxOpen.value = false;
    } else if (lightboxIndex.value >= displayedPhotos.value.length) {
      lightboxIndex.value = displayedPhotos.value.length - 1;
    }
    uiStore.notifySuccess('已移除该影像');
  } catch (err: any) {
    uiStore.notifyError(err?.message || '删除失败');
  }
}

function handleUploadSuccess() {
  loadGalleryPhotos(true);
  if (activeCollectionSlug.value) {
    loadCollectionDetail(activeCollectionSlug.value);
  }
}

function handleCollectionUpdated() {
  loadCollections();
  if (activeCollectionSlug.value) {
    loadCollectionDetail(activeCollectionSlug.value);
  }
}

watch(
  () => [route.params.slug, route.query.collection] as const,
  () => {
    const slug = getRouteCollectionSlug();
    if (slug) {
      galleryMode.value = 'collections';
      if (activeCollectionSlug.value !== slug || !activeCollectionDetail.value) {
        activeCollectionSlug.value = slug;
        loadCollectionDetail(slug);
      }
    } else if (galleryMode.value === 'collections' && activeCollectionSlug.value) {
      activeCollectionSlug.value = null;
      activeCollectionDetail.value = null;
      collectionError.value = null;
      if (collections.value.length === 0) {
        loadCollections();
      }
    }
  }
);

watch(
  () => authStore.isAdmin,
  () => {
    loadGalleryPhotos(true);
    loadCollections();
    if (activeCollectionSlug.value) {
      loadCollectionDetail(activeCollectionSlug.value);
    }
  }
);

watch(
  () => uiStore.pendingAction,
  (action) => {
    if (action === 'photo') {
      uiStore.consumeQuickAction('photo');
      openUploader(activeCollectionDetail.value?.collection.id);
    }
  },
  { immediate: true }
);

onMounted(() => {
  const initialSlug = getRouteCollectionSlug();
  if (initialSlug) {
    galleryMode.value = 'collections';
    activeCollectionSlug.value = initialSlug;
    loadCollectionDetail(initialSlug);
    loadCollections();
  } else {
    loadGalleryPhotos(true);
    loadCollections();
  }
});
</script>
