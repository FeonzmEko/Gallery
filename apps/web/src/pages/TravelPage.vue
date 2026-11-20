<template>
  <div class="gallery-reveal space-y-10 sm:space-y-12">
    <!-- ========================================================= -->
    <!-- ATLAS MONOGRAPH MASTHEAD                                  -->
    <!-- ========================================================= -->
    <section class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-end pb-8 border-b border-[#DDD6C9]">
      <div class="lg:col-span-7 space-y-3">
        <div class="flex items-center gap-3 kicker-caps text-[#3D4E42]">
          <span>CHAPTER IV</span>
          <span class="w-6 h-[1px] bg-[#C4BBA9]"></span>
          <span class="text-[#787268]">GEOGRAPHIC ATLAS · GEODESIC ROUTES</span>
        </div>
        <div class="flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <h1 class="font-serif text-4xl sm:text-5xl lg:text-[54px] font-light tracking-[0.04em] text-[#161513] leading-[1.12]">
            足迹漫游
          </h1>
          <span class="font-display italic text-2xl sm:text-3xl font-light text-[#9B9488] tracking-wide">
            Atlas des voyages
          </span>
        </div>
      </div>

      <div class="lg:col-span-5 flex flex-col lg:items-end justify-between gap-4">
        <p class="font-serif text-[13.5px] sm:text-sm text-[#57534C] leading-[1.85] lg:text-right max-w-md font-light">
          丈量山海与城郭，以经纬坐标与大圆航距串联生命旅途的地理档案。
        </p>

        <div class="flex flex-wrap items-center gap-5">
          <div class="relative flex items-center">
            <SearchIcon class="w-3.5 h-3.5 text-[#9B9488] pointer-events-none mr-2" />
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="检索目的地或城市..."
              class="w-40 sm:w-48 bg-transparent border-b border-[#C4BBA9] focus:border-[#161513] pb-1 text-xs text-[#161513] placeholder-[#9B9488] focus:outline-none transition-colors"
              @input="handleSearchDebounced"
            />
          </div>

          <button
            v-if="authStore.isAdmin"
            type="button"
            class="inline-flex items-center gap-2 rounded-[2px] bg-[#3D4E42] px-4 py-2 text-xs font-serif tracking-[0.14em] text-[#FAF8F4] hover:bg-[#161513] transition-colors duration-200"
            @click="openCreateTripModal"
          >
            <MapPinPlusIcon class="w-3.5 h-3.5" />
            <span>标记新足迹</span>
          </button>
        </div>
      </div>
    </section>

    <!-- ========================================================= -->
    <!-- ARCHIVAL CARTOGRAPHY PLATE + EXPEDITION LEDGER            -->
    <!-- ========================================================= -->
    <section class="grid grid-cols-1 lg:grid-cols-12 gap-7 items-stretch">
      <!-- Left: Framed Cartographic Plate -->
      <div class="lg:col-span-8 passe-partout rounded-[2px] p-4 sm:p-5 flex flex-col gap-3.5">
        <div class="flex flex-wrap items-center justify-between gap-2 pb-1">
          <div class="flex items-center gap-2.5 text-xs">
            <span class="w-1.5 h-1.5 rounded-full bg-[#3D4E42]"></span>
            <span class="kicker-caps text-[#787268]">ACTIVE ROUTE</span>
            <span class="text-[#C4BBA9]">/</span>
            <span class="font-serif text-[#161513] font-medium">
              {{ activeTrip?.title || '全部足迹聚合图谱' }}
            </span>
          </div>

          <div class="flex items-center gap-4 font-mono text-[11px] text-[#787268] tabular-nums">
            <span v-if="activeTrip?.distanceKm">{{ activeTrip.distanceKm.toFixed(1) }} KM</span>
            <span v-if="activeMarkers.length > 0">{{ activeMarkers.length }} NODES</span>
            <button
              v-if="activeTrip && trips.length > 1"
              type="button"
              class="text-[#9A3F2B] hover:underline underline-offset-4"
              @click="activeTrip = null"
            >
              全部聚合
            </button>
          </div>
        </div>

        <LeafletMap
          :markers="activeMarkers"
          :polyline="activePolyline"
          height="390px"
        />
      </div>

      <!-- Right: Expedition Stop Ledger -->
      <div class="lg:col-span-4 museum-plate rounded-[2px] p-6 sm:p-7 flex flex-col justify-between">
        <div>
          <div class="flex items-start justify-between border-b border-[#DDD6C9] pb-4 mb-5">
            <div class="space-y-1">
              <span class="kicker-caps text-[#3D4E42] block">EXPEDITION LEDGER</span>
              <h3 class="font-serif text-xl font-normal text-[#161513] leading-snug">
                {{ activeTrip ? activeTrip.title : '全站行程概览' }}
              </h3>
            </div>
            <span
              v-if="activeTrip?.countryCode"
              class="font-mono text-[10px] tracking-[0.18em] text-[#787268] border border-[#DDD6C9] px-2 py-0.5 rounded-[2px]"
            >
              {{ activeTrip.countryCode }}
            </span>
          </div>

          <div
            v-if="activeTrip && activeTrip.locations && activeTrip.locations.length > 0"
            class="overflow-y-auto divide-y divide-[#E8E2D6] max-h-[340px] pr-1"
          >
            <div
              v-for="(loc, idx) in activeTrip.locations"
              :key="loc.id || idx"
              class="py-3.5 first:pt-0 flex items-start gap-3.5"
            >
              <span class="font-display italic text-lg text-[#9A3F2B] leading-none pt-0.5 w-5 shrink-0 tabular-nums">
                {{ String(idx + 1).padStart(2, '0') }}
              </span>
              <div class="min-w-0 flex-1">
                <div class="font-serif text-[13.5px] text-[#161513] truncate">{{ loc.name }}</div>
                <div v-if="loc.notes" class="text-xs text-[#57534C] mt-1 leading-relaxed font-light">{{ loc.notes }}</div>
                <div class="text-[10px] font-mono text-[#9B9488] mt-1.5 tracking-wider tabular-nums">
                  {{ loc.latitude.toFixed(4) }}° N, {{ loc.longitude.toFixed(4) }}° E
                </div>
              </div>
            </div>
          </div>

          <div v-else class="flex flex-col items-center justify-center text-center py-16 text-xs text-[#787268]">
            <span class="font-display italic text-2xl text-[#C4BBA9] mb-3">N / E</span>
            <p class="font-serif leading-relaxed max-w-[220px]">
              {{ activeTrip ? '该行程暂未录入具体经纬节点。' : '点选下方任一行程卷宗，即可聚焦查看路线坐标与航距。' }}
            </p>
          </div>
        </div>

        <div v-if="activeTrip" class="mt-6 pt-4 border-t border-[#DDD6C9] flex items-baseline justify-between">
          <span class="font-mono text-[11px] text-[#787268] tabular-nums">{{ formatDateRange(activeTrip) }}</span>
          <div class="text-right">
            <span class="kicker-caps text-[#9B9488] mr-2">DISTANCE</span>
            <span class="font-display italic text-2xl text-[#161513] tabular-nums">
              {{ (activeTrip.distanceKm || 0).toFixed(1) }} <span class="text-sm font-mono not-italic text-[#787268]">km</span>
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- ========================================================= -->
    <!-- VOYAGE INDEX CATALOGUE                                    -->
    <!-- ========================================================= -->
    <section class="space-y-6 pt-2">
      <div class="flex items-baseline justify-between border-b border-[#DDD6C9] pb-3.5">
        <div class="flex items-baseline gap-3">
          <h3 class="font-serif text-xl font-normal text-[#161513]">行程图录</h3>
          <span class="font-display italic text-base text-[#9B9488]">Voyage Index</span>
        </div>
        <span class="font-mono text-[11px] tracking-[0.14em] text-[#787268] tabular-nums">
          {{ trips.length }} 段旅途 · 共 {{ totalDistanceKm.toFixed(0) }} KM
        </span>
      </div>

      <!-- Loading Skeleton -->
      <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="i in 3"
          :key="i"
          class="h-44 bg-[#FAF8F4] border border-[#DDD6C9] p-6 animate-pulse space-y-4"
        >
          <div class="h-3 bg-[#EAE4D8] w-1/3"></div>
          <div class="h-6 bg-[#EAE4D8] w-2/3"></div>
          <div class="h-10 bg-[#EAE4D8]/60 w-full"></div>
        </div>
      </div>

      <!-- Serene Empty State -->
      <div
        v-else-if="trips.length === 0"
        class="py-20 px-6 text-center flex flex-col items-center justify-center border-y border-[#DDD6C9] bg-[#FAF8F4]/40"
      >
        <div class="w-[1px] h-8 bg-[#C4BBA9] mb-5"></div>
        <p class="font-display italic text-lg text-[#9B9488]">Uncharted Territory</p>
        <h4 class="mt-2 font-serif text-xl font-light tracking-[0.08em] text-[#161513]">暂无旅行足迹记录</h4>
        <p class="text-xs text-[#787268] mt-2 max-w-sm leading-[1.9] font-light">
          {{ searchKeyword ? '没有找到匹配的行程记录。' : '尚未收录任何行程点位，管理员可点击右上角“标记新足迹”绘制探索图谱。' }}
        </p>
      </div>

      <!-- Architectural Voyage Cards -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <article
          v-for="(trip, idx) in trips"
          :key="trip.id"
          class="group museum-plate rounded-[2px] p-6 cursor-pointer flex flex-col justify-between gap-5 relative"
          :class="activeTrip?.id === trip.id ? 'border-[#161513] bg-[#FAF8F4]' : ''"
          @click="selectTrip(trip)"
        >
          <!-- Active Top Cinnabar Hairline -->
          <span
            v-if="activeTrip?.id === trip.id"
            class="absolute top-0 inset-x-0 h-[2px] bg-[#9A3F2B]"
          ></span>

          <div class="space-y-3">
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2 kicker-caps text-[#787268]">
                <span class="text-[#3D4E42] tabular-nums">{{ formatDateRange(trip) }}</span>
                <span v-if="trip.countryCode" class="text-[#C4BBA9]">/</span>
                <span v-if="trip.countryCode">{{ trip.countryCode }}</span>
                <span v-if="trip.visibility === 'private'" class="text-[#9A6B2F]">· PRIVATE</span>
              </div>

              <div class="flex items-center gap-1.5">
                <span class="font-display italic text-lg text-[#C4BBA9] leading-none tabular-nums">
                  {{ String(idx + 1).padStart(2, '0') }}
                </span>
                <div
                  v-if="authStore.isAdmin"
                  class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  @click.stop
                >
                  <button
                    type="button"
                    class="p-1 text-[#787268] hover:text-[#9A3F2B]"
                    @click="openEditTripModal(trip)"
                    title="编辑行程"
                  >
                    <PencilIcon class="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    class="p-1 text-[#787268] hover:text-[#9A3F2B]"
                    @click="handleDeleteTrip(trip.id)"
                    title="删除行程"
                  >
                    <Trash2Icon class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h4
                class="font-serif text-lg font-normal transition-colors leading-snug"
                :class="activeTrip?.id === trip.id ? 'text-[#9A3F2B]' : 'text-[#161513] group-hover:text-[#9A3F2B]'"
              >
                {{ trip.title }}
              </h4>
              <p v-if="trip.citySummary" class="mt-1 text-[11px] font-serif tracking-wider text-[#3D4E42]">
                {{ trip.citySummary }}
              </p>
              <p v-if="trip.summary" class="mt-2.5 text-xs text-[#57534C] line-clamp-2 leading-[1.8] font-light">
                {{ trip.summary }}
              </p>
            </div>
          </div>

          <div class="pt-4 border-t border-[#E8E2D6] flex items-center justify-between text-[11px] font-mono text-[#787268] tabular-nums">
            <span>
              {{ trip.locations?.length || 0 }} 节点
              <template v-if="trip.distanceKm"> · {{ trip.distanceKm.toFixed(1) }} km</template>
            </span>
            <span
              class="font-serif tracking-[0.12em]"
              :class="activeTrip?.id === trip.id ? 'text-[#9A3F2B]' : 'text-[#9B9488] group-hover:text-[#161513]'"
            >
              {{ activeTrip?.id === trip.id ? '当前聚焦' : '聚焦航迹 →' }}
            </span>
          </div>
        </article>
      </div>

      <!-- Pagination -->
      <div v-if="hasMore" class="pt-6 text-center">
        <button
          type="button"
          :disabled="isLoadingMore"
          class="inline-flex items-center gap-3 px-8 py-3 rounded-[2px] border border-[#161513] text-xs font-serif tracking-[0.18em] text-[#161513] hover:bg-[#161513] hover:text-[#FAF8F4] transition-colors disabled:opacity-40"
          @click="loadTrips(false)"
        >
          <Loader2Icon v-if="isLoadingMore" class="w-3.5 h-3.5 animate-spin" />
          <span>{{ isLoadingMore ? '加载更多行程...' : '展开更多行程' }}</span>
        </button>
      </div>
    </section>

    <!-- ========================================================= -->
    <!-- CREATE / EDIT TRIP MODAL                                  -->
    <!-- ========================================================= -->
    <Teleport to="body">
      <div
        v-if="isTripModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
      >
        <div class="fixed inset-0 bg-[#161513]/55 backdrop-blur-xs" @click="isTripModalOpen = false"></div>
        <div class="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-[2px] border border-[#DDD6C9] bg-[#F3EFE7] shadow-2xl overflow-hidden">
          <div class="flex items-center justify-between border-b border-[#DDD6C9] px-6 py-4 bg-[#FAF8F4]">
            <div class="space-y-0.5">
              <span class="kicker-caps text-[#3D4E42] block">CARTOGRAPHY EDITOR</span>
              <h3 class="font-serif text-lg font-normal text-[#161513]">
                {{ editingTripId ? '编辑旅行足迹' : '记录全新旅行足迹' }}
              </h3>
            </div>
            <button
              type="button"
              class="p-1.5 text-[#787268] hover:text-[#161513]"
              @click="isTripModalOpen = false"
            >
              <XIcon class="w-5 h-5" />
            </button>
          </div>

          <form @submit.prevent="handleSaveTrip" class="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div class="sm:col-span-2">
                <label class="block kicker-caps text-[#787268] mb-1.5">旅行名称 *</label>
                <input
                  v-model="tripForm.title"
                  type="text"
                  required
                  placeholder="例如：日本关西红叶巡礼 2026"
                  class="w-full editorial-field px-3.5 py-2 text-sm"
                />
              </div>

              <div>
                <label class="block kicker-caps text-[#787268] mb-1.5">出发日期 *</label>
                <input
                  v-model="startDateStr"
                  type="date"
                  required
                  class="w-full editorial-field px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label class="block kicker-caps text-[#787268] mb-1.5">返程日期 *</label>
                <input
                  v-model="endDateStr"
                  type="date"
                  required
                  class="w-full editorial-field px-3 py-2 font-mono"
                />
              </div>

              <div>
                <label class="block kicker-caps text-[#787268] mb-1.5">国家 / 地区码</label>
                <input
                  v-model="tripForm.countryCode"
                  type="text"
                  placeholder="例如：JPN 或 CHN"
                  class="w-full editorial-field px-3.5 py-2 font-mono"
                />
              </div>
              <div>
                <label class="block kicker-caps text-[#787268] mb-1.5">城市简述</label>
                <input
                  v-model="tripForm.citySummary"
                  type="text"
                  placeholder="例如：京都 · 大阪 · 奈良"
                  class="w-full editorial-field px-3.5 py-2"
                />
              </div>

              <div>
                <label class="block kicker-caps text-[#787268] mb-1.5">可见权限</label>
                <select v-model="tripForm.visibility" class="w-full editorial-field px-3 py-2">
                  <option value="public">公开策展 (Public)</option>
                  <option value="private">私密仅己可见 (Private)</option>
                </select>
              </div>
              <div>
                <label class="block kicker-caps text-[#787268] mb-1.5">标签 (逗号分隔)</label>
                <input
                  v-model="tripTagsInput"
                  type="text"
                  placeholder="例如：旅行, 摄影, 徒步"
                  class="w-full editorial-field px-3.5 py-2"
                />
              </div>
            </div>

            <div>
              <label class="block kicker-caps text-[#787268] mb-1.5">行程概述</label>
              <textarea
                v-model="tripForm.summary"
                rows="2"
                placeholder="记录本次旅途的主要亮点与路线..."
                class="w-full editorial-field px-3.5 py-2"
              ></textarea>
            </div>

            <!-- Interactive Map Picker & Custom Waypoints -->
            <div class="rounded-[2px] border border-[#DDD6C9] bg-[#FAF8F4] p-4 space-y-3.5">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="font-serif text-xs text-[#161513]">打卡节点编辑器 (点击地图拾取坐标或手动录入)</span>
                <div class="flex items-center gap-2">
                  <button
                    v-for="preset in presets"
                    :key="preset.name"
                    type="button"
                    class="px-2.5 py-1 rounded-[2px] border border-[#DDD6C9] bg-[#F3EFE7] text-[11px] text-[#787268] hover:border-[#3D4E42] hover:text-[#161513] transition-colors"
                    @click="applyPreset(preset)"
                  >
                    载入示例: {{ preset.shortLabel }}
                  </button>
                </div>
              </div>

              <LeafletMap
                :markers="editorMarkers"
                :polyline="editorPolyline"
                :pick-mode="true"
                height="220px"
                @map-click="handleEditorMapClick"
              />

              <div class="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                <input
                  v-model="draftWaypoint.name"
                  type="text"
                  placeholder="地点名称 *"
                  class="sm:col-span-4 editorial-field px-2.5 py-1.5 text-xs"
                />
                <input
                  v-model.number="draftWaypoint.latitude"
                  type="number"
                  step="any"
                  placeholder="纬度 (-90~90)"
                  class="sm:col-span-2 editorial-field px-2.5 py-1.5 text-xs font-mono"
                />
                <input
                  v-model.number="draftWaypoint.longitude"
                  type="number"
                  step="any"
                  placeholder="经度 (-180~180)"
                  class="sm:col-span-2 editorial-field px-2.5 py-1.5 text-xs font-mono"
                />
                <input
                  v-model="draftWaypoint.notes"
                  type="text"
                  placeholder="备注 (可选)"
                  class="sm:col-span-3 editorial-field px-2.5 py-1.5 text-xs"
                />
                <button
                  type="button"
                  class="sm:col-span-1 rounded-[2px] bg-[#3D4E42] text-[#FAF8F4] px-2.5 py-1.5 font-serif hover:bg-[#161513] transition-colors"
                  @click="addDraftWaypoint"
                >
                  添加
                </button>
              </div>

              <div v-if="tripForm.locations.length > 0" class="divide-y divide-[#E8E2D6] max-h-40 overflow-y-auto pt-1">
                <div
                  v-for="(loc, idx) in tripForm.locations"
                  :key="idx"
                  class="flex items-center justify-between gap-2 py-2"
                >
                  <div class="flex items-center gap-2.5 min-w-0">
                    <span class="font-display italic text-sm text-[#9A3F2B] tabular-nums">{{ String(idx + 1).padStart(2, '0') }}</span>
                    <span class="font-serif text-[#161513] truncate">{{ loc.name }}</span>
                    <span class="font-mono text-[10px] text-[#9B9488] tabular-nums">({{ loc.latitude.toFixed(4) }}, {{ loc.longitude.toFixed(4) }})</span>
                    <span v-if="loc.notes" class="text-[11px] text-[#787268] truncate hidden sm:inline">· {{ loc.notes }}</span>
                  </div>
                  <button
                    type="button"
                    class="text-[#9B9488] hover:text-[#9A3F2B] p-1"
                    @click="removeWaypoint(idx)"
                    title="移除节点"
                  >
                    <XIcon class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 pt-4 border-t border-[#DDD6C9]">
              <button
                type="button"
                class="px-4 py-2 text-[#787268] hover:text-[#161513] font-serif tracking-wider"
                @click="isTripModalOpen = false"
              >
                取消
              </button>
              <button
                type="submit"
                :disabled="isSubmitting"
                class="inline-flex items-center gap-2 px-6 py-2.5 rounded-[2px] bg-[#3D4E42] text-[#FAF8F4] font-serif tracking-[0.14em] hover:bg-[#161513] transition-colors disabled:opacity-50"
              >
                <Loader2Icon v-if="isSubmitting" class="w-3.5 h-3.5 animate-spin" />
                <span>{{ editingTripId ? '保存修改' : '确认归档路线' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import {
  MapPinPlus as MapPinPlusIcon,
  Search as SearchIcon,
  Pencil as PencilIcon,
  Trash2 as Trash2Icon,
  X as XIcon,
  Loader2 as Loader2Icon,
} from 'lucide-vue-next';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { useUiStore } from '@/shared/stores/ui.store';
import { apiClient } from '@/shared/api/client';
import LeafletMap, { type MapMarker } from '@/shared/components/map/LeafletMap.vue';
import { getYear, getMonth } from '@archive/shared';
import type { Visibility } from '@archive/contracts';

const authStore = useAuthStore();
const uiStore = useUiStore();

interface WaypointInput {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  notes?: string | null;
  sortOrder?: number;
}

interface TripItem {
  id: string;
  title: string;
  summary?: string | null;
  countryCode?: string | null;
  citySummary?: string | null;
  distanceKm?: number;
  startDate: number;
  endDate: number;
  occurredAt: number;
  visibility: Visibility;
  tags?: string[];
  locations: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    visitedAt?: number | null;
    notes?: string | null;
    sortOrder?: number;
  }>;
}

const presets = [
  {
    shortLabel: '关西红叶线',
    name: '日本关西红叶巡礼',
    countryCode: 'JPN',
    citySummary: '京都 · 奈良 · 大阪',
    locations: [
      { name: '清水寺 (Kiyomizu-dera)', latitude: 34.9949, longitude: 135.785, notes: '晨曦俯瞰音羽山' },
      { name: '伏见稻荷大社', latitude: 34.9671, longitude: 135.7727, notes: '千本鸟居漫步' },
      { name: '奈良公园', latitude: 34.6851, longitude: 135.843, notes: '若草山下小鹿' },
      { name: '道顿堀', latitude: 34.6687, longitude: 135.5013, notes: '夜幕霓虹与街头小吃' },
    ],
  },
  {
    shortLabel: '川西高原环线',
    name: '川西高原光影漫游',
    countryCode: 'CHN',
    citySummary: '成都 · 康定 · 新都桥',
    locations: [
      { name: '成都宽窄巷子', latitude: 30.6698, longitude: 104.0535, notes: '天府启程' },
      { name: '康定折多山', latitude: 30.0768, longitude: 101.8159, notes: '海拔 4298 米垭口' },
      { name: '新都桥光影长廊', latitude: 30.0267, longitude: 101.5238, notes: '秋色白杨林' },
    ],
  },
];

const isLoading = ref(true);
const isLoadingMore = ref(false);
const isSubmitting = ref(false);
const trips = ref<TripItem[]>([]);
const activeTrip = ref<TripItem | null>(null);
const nextCursor = ref<string | null>(null);
const hasMore = ref(false);
const searchKeyword = ref('');

const isTripModalOpen = ref(false);
const editingTripId = ref<string | null>(null);
const startDateStr = ref('');
const endDateStr = ref('');
const tripTagsInput = ref('');

const tripForm = ref<{
  title: string;
  countryCode: string;
  citySummary: string;
  summary: string;
  visibility: Visibility;
  locations: WaypointInput[];
}>({
  title: '',
  countryCode: '',
  citySummary: '',
  summary: '',
  visibility: 'public',
  locations: [],
});

const draftWaypoint = ref<{
  name: string;
  latitude: number | null;
  longitude: number | null;
  notes: string;
}>({
  name: '',
  latitude: null,
  longitude: null,
  notes: '',
});

const totalDistanceKm = computed(() =>
  trips.value.reduce((sum, t) => sum + (t.distanceKm || 0), 0)
);

const activeMarkers = computed<MapMarker[]>(() => {
  if (activeTrip.value && activeTrip.value.locations?.length) {
    return activeTrip.value.locations.map((loc, idx) => ({
      id: loc.id || String(idx),
      lat: loc.latitude,
      lng: loc.longitude,
      title: loc.name,
      description: loc.notes ?? undefined,
    }));
  }

  const markers: MapMarker[] = [];
  for (const t of trips.value) {
    for (const loc of t.locations || []) {
      markers.push({
        id: loc.id,
        lat: loc.latitude,
        lng: loc.longitude,
        title: `${t.title} · ${loc.name}`,
        description: loc.notes ?? undefined,
      });
    }
  }
  return markers;
});

const activePolyline = computed<[number, number][]>(() => {
  if (activeTrip.value && activeTrip.value.locations?.length > 1) {
    return activeTrip.value.locations.map((loc) => [loc.latitude, loc.longitude]);
  }
  return [];
});

const editorMarkers = computed<MapMarker[]>(() =>
  tripForm.value.locations.map((loc, idx) => ({
    id: String(idx),
    lat: loc.latitude,
    lng: loc.longitude,
    title: loc.name,
    description: loc.notes ?? undefined,
  }))
);

const editorPolyline = computed<[number, number][]>(() =>
  tripForm.value.locations.length > 1
    ? tripForm.value.locations.map((loc) => [loc.latitude, loc.longitude])
    : []
);

function selectTrip(trip: TripItem) {
  activeTrip.value = trip;
}

function formatDateRange(trip: TripItem): string {
  const start = trip.startDate || trip.occurredAt || Date.now();
  return `${getYear(start)}.${String(getMonth(start)).padStart(2, '0')}`;
}

function toDateInput(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function openCreateTripModal() {
  editingTripId.value = null;
  tripForm.value = {
    title: '',
    countryCode: '',
    citySummary: '',
    summary: '',
    visibility: 'public',
    locations: [],
  };
  const now = Date.now();
  startDateStr.value = toDateInput(now);
  endDateStr.value = toDateInput(now + 86400000 * 3);
  tripTagsInput.value = '';
  draftWaypoint.value = { name: '', latitude: null, longitude: null, notes: '' };
  isTripModalOpen.value = true;
}

function openEditTripModal(trip: TripItem) {
  editingTripId.value = trip.id;
  tripForm.value = {
    title: trip.title,
    countryCode: trip.countryCode || '',
    citySummary: trip.citySummary || '',
    summary: trip.summary || '',
    visibility: trip.visibility || 'public',
    locations: (trip.locations || []).map((l, idx) => ({
      id: l.id,
      name: l.name,
      latitude: l.latitude,
      longitude: l.longitude,
      notes: l.notes ?? '',
      sortOrder: idx,
    })),
  };
  startDateStr.value = toDateInput(trip.startDate || trip.occurredAt);
  endDateStr.value = toDateInput(trip.endDate || trip.startDate || trip.occurredAt);
  tripTagsInput.value = (trip.tags || []).join(', ');
  draftWaypoint.value = { name: '', latitude: null, longitude: null, notes: '' };
  isTripModalOpen.value = true;
}

function applyPreset(preset: typeof presets[number]) {
  if (!tripForm.value.title) tripForm.value.title = preset.name;
  if (!tripForm.value.countryCode) tripForm.value.countryCode = preset.countryCode;
  if (!tripForm.value.citySummary) tripForm.value.citySummary = preset.citySummary;
  tripForm.value.locations = preset.locations.map((l, idx) => ({
    ...l,
    sortOrder: idx,
  }));
}

function handleEditorMapClick(coords: { lat: number; lng: number }) {
  draftWaypoint.value.latitude = coords.lat;
  draftWaypoint.value.longitude = coords.lng;
  if (!draftWaypoint.value.name) {
    draftWaypoint.value.name = `途经点 #${tripForm.value.locations.length + 1}`;
  }
}

function addDraftWaypoint() {
  const lat = draftWaypoint.value.latitude;
  const lng = draftWaypoint.value.longitude;
  if (!draftWaypoint.value.name.trim()) {
    uiStore.notifyError('请输入打卡地点名称');
    return;
  }
  if (lat === null || lng === null || isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    uiStore.notifyError('请输入合法的经纬度（或点击上方地图自动拾取）');
    return;
  }

  tripForm.value.locations.push({
    name: draftWaypoint.value.name.trim(),
    latitude: lat,
    longitude: lng,
    notes: draftWaypoint.value.notes.trim() || null,
    sortOrder: tripForm.value.locations.length,
  });

  draftWaypoint.value = { name: '', latitude: null, longitude: null, notes: '' };
}

function removeWaypoint(idx: number) {
  tripForm.value.locations.splice(idx, 1);
  tripForm.value.locations.forEach((l, i) => {
    l.sortOrder = i;
  });
}

let searchTimer: number | null = null;
function handleSearchDebounced() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    loadTrips(true);
  }, 300);
}

async function loadTrips(reset: boolean = true) {
  if (reset) {
    isLoading.value = true;
    nextCursor.value = null;
  } else {
    isLoadingMore.value = true;
  }

  try {
    const params: Record<string, string | number> = { limit: 20 };
    if (searchKeyword.value.trim()) params.search = searchKeyword.value.trim();
    if (!reset && nextCursor.value) params.cursor = nextCursor.value;

    const res = await apiClient.getPaginated<TripItem>('/api/v1/trips', { params });
    if (reset) {
      trips.value = res.items;
      if (res.items.length > 0) {
        activeTrip.value = res.items[0];
      } else {
        activeTrip.value = null;
      }
    } else {
      trips.value = [...trips.value, ...res.items];
    }
    nextCursor.value = res.pagination.cursor;
    hasMore.value = res.pagination.hasMore;
  } catch (err: any) {
    uiStore.notifyError(err?.message || '加载旅行足迹失败');
  } finally {
    isLoading.value = false;
    isLoadingMore.value = false;
  }
}

async function handleSaveTrip() {
  const startDate = new Date(`${startDateStr.value}T00:00:00`).getTime();
  const endDate = new Date(`${endDateStr.value}T23:59:59`).getTime();

  if (isNaN(startDate) || isNaN(endDate) || endDate < startDate) {
    uiStore.notifyError('返程日期不能早于出发日期');
    return;
  }

  const tags = tripTagsInput.value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  isSubmitting.value = true;
  try {
    const payload = {
      title: tripForm.value.title.trim(),
      summary: tripForm.value.summary.trim() || null,
      countryCode: tripForm.value.countryCode.trim() || null,
      citySummary: tripForm.value.citySummary.trim() || null,
      startDate,
      endDate,
      visibility: tripForm.value.visibility,
      tags,
      locations: tripForm.value.locations.map((loc, idx) => ({
        name: loc.name,
        latitude: loc.latitude,
        longitude: loc.longitude,
        notes: loc.notes || null,
        sortOrder: idx,
      })),
    };

    let saved: TripItem;
    if (editingTripId.value) {
      saved = await apiClient.put<TripItem>(`/api/v1/trips/${editingTripId.value}`, payload);
      uiStore.notifySuccess('行程足迹已更新');
    } else {
      saved = await apiClient.post<TripItem>('/api/v1/trips', payload);
      uiStore.notifySuccess('新旅行足迹已归档');
    }

    isTripModalOpen.value = false;
    await loadTrips(true);
    const matched = trips.value.find((t) => t.id === saved.id);
    if (matched) activeTrip.value = matched;
  } catch (err: any) {
    uiStore.notifyError(err?.message || '保存旅行足迹失败');
  } finally {
    isSubmitting.value = false;
  }
}

async function handleDeleteTrip(id: string) {
  const ok = await uiStore.confirm({
    title: '删除旅行足迹',
    message: '确定要删除这段行程记录吗？关联的地图打卡点也将一并移除。',
    confirmLabel: '确认删除',
    danger: true,
  });
  if (!ok) return;

  try {
    await apiClient.delete(`/api/v1/trips/${id}`);
    trips.value = trips.value.filter((t) => t.id !== id);
    if (activeTrip.value?.id === id) {
      activeTrip.value = trips.value[0] ?? null;
    }
    uiStore.notifySuccess('已移除该行程记录');
  } catch (err: any) {
    uiStore.notifyError(err?.message || '删除行程失败');
  }
}

watch(
  () => authStore.isAdmin,
  () => {
    loadTrips(true);
  }
);

watch(
  () => uiStore.pendingAction,
  (action) => {
    if (action === 'trip') {
      uiStore.consumeQuickAction('trip');
      openCreateTripModal();
    }
  },
  { immediate: true }
);

onMounted(() => {
  loadTrips(true);
});
</script>
