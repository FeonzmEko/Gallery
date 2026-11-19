<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-[#E5E1D8] pb-6">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="text-[11px] font-mono tracking-widest text-[#4E6053] uppercase font-semibold">GEOGRAPHIC ATLAS</span>
          <span class="text-[#D4CEBF]">&middot;</span>
          <span class="text-[11px] font-mono text-[#9E9B93]">OPENSTREETMAP 航迹</span>
        </div>
        <h1 class="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-[#1D1C1A]">
          足迹漫游
        </h1>
        <p class="mt-1 text-sm text-[#747169] font-serif italic">
          “丈量山海与城郭，以经纬点位与大圆航距串联生命旅途。”
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <div class="relative">
          <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9E9B93]" />
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="检索目的地或城市..."
            class="w-48 sm:w-56 rounded-xl bg-white border border-[#E5E1D8] pl-9 pr-3 py-2 text-xs text-[#1D1C1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#4E6053] transition-all shadow-xs"
            @input="handleSearchDebounced"
          />
        </div>

        <button
          v-if="authStore.isAdmin"
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-[#4E6053] px-4 py-2 text-xs font-semibold text-white hover:bg-[#3D4C41] shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
          @click="openCreateTripModal"
        >
          <MapPinPlusIcon class="w-3.5 h-3.5" />
          <span>标记新足迹</span>
        </button>
      </div>
    </div>

    <!-- Map + Active Trip Bento Board -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      <!-- Left: Leaflet Interactive Map Mat Board -->
      <div class="lg:col-span-8 bg-white p-2.5 sm:p-3 rounded-2xl border border-[#E5E1D8] shadow-xs flex flex-col gap-2.5">
        <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-[#747169] px-1.5 pt-0.5">
          <span class="flex items-center gap-2 font-mono text-[11px]">
            <span class="h-2 w-2 rounded-full bg-[#4E6053] animate-pulse"></span>
            <span>当前航迹：<strong class="text-[#1D1C1A] font-medium">{{ activeTrip?.title || '全部足迹聚合视图' }}</strong></span>
          </span>
          <div class="flex items-center gap-3 font-mono text-[11px] text-[#9E9B93]">
            <span v-if="activeTrip?.distanceKm">{{ activeTrip.distanceKm.toFixed(1) }} km</span>
            <span v-if="activeMarkers.length > 0">{{ activeMarkers.length }} 个坐标节点</span>
            <button
              v-if="activeTrip && trips.length > 1"
              type="button"
              class="text-[#C25438] hover:underline"
              @click="activeTrip = null"
            >
              查看全部聚合
            </button>
          </div>
        </div>

        <LeafletMap
          :markers="activeMarkers"
          :polyline="activePolyline"
          height="420px"
        />
      </div>

      <!-- Right: Active Itinerary Stop List -->
      <div class="lg:col-span-4 bg-white rounded-2xl border border-[#E5E1D8] p-5 shadow-xs flex flex-col">
        <div class="flex items-center justify-between border-b border-[#F0ECE1] pb-3 mb-3">
          <div>
            <span class="text-[10px] font-mono uppercase tracking-wider text-[#4E6053] font-semibold">ITINERARY STOPS</span>
            <h3 class="font-serif text-base font-medium text-[#1D1C1A] mt-0.5">
              {{ activeTrip ? activeTrip.title : '全站行程概览' }}
            </h3>
          </div>
          <span v-if="activeTrip?.countryCode" class="rounded-md bg-[#F7F5F0] px-2 py-0.5 text-[10px] font-mono text-[#747169] border border-[#E5E1D8]">
            {{ activeTrip.countryCode }}
          </span>
        </div>

        <div v-if="activeTrip && activeTrip.locations && activeTrip.locations.length > 0" class="flex-1 overflow-y-auto space-y-3 max-h-[340px] pr-1">
          <div
            v-for="(loc, idx) in activeTrip.locations"
            :key="loc.id || idx"
            class="flex items-start gap-3 rounded-xl bg-[#F7F5F0]/70 border border-[#E5E1D8] p-3"
          >
            <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#4E6053] text-white font-mono text-[11px] font-semibold">
              {{ idx + 1 }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-xs font-medium text-[#1D1C1A] truncate">{{ loc.name }}</div>
              <div v-if="loc.notes" class="text-[11px] text-[#747169] mt-0.5 leading-relaxed">{{ loc.notes }}</div>
              <div class="text-[10px] font-mono text-[#9E9B93] mt-1">
                {{ loc.latitude.toFixed(4) }}, {{ loc.longitude.toFixed(4) }}
              </div>
            </div>
          </div>
        </div>
        <div v-else class="flex-1 flex flex-col items-center justify-center text-center py-10 text-xs text-[#747169]">
          <CompassIcon class="w-8 h-8 text-[#D4CEBF] mb-2" />
          <p v-if="activeTrip">该行程暂未录入具体经纬节点。</p>
          <p v-else>选择下方任意行程卡片即可聚焦查看该段路线的详细节点与里程。</p>
        </div>

        <div v-if="activeTrip" class="mt-4 pt-3 border-t border-[#F0ECE1] flex items-center justify-between text-xs font-mono text-[#747169]">
          <span>{{ formatDateRange(activeTrip) }}</span>
          <span class="text-[#4E6053] font-semibold">总航距 {{ (activeTrip.distanceKm || 0).toFixed(1) }} km</span>
        </div>
      </div>
    </div>

    <!-- Trips Cards Grid -->
    <div class="space-y-4 pt-2">
      <div class="flex items-center justify-between">
        <h3 class="font-serif text-xl font-medium text-[#1D1C1A] flex items-center gap-2">
          <MapPinIcon class="w-4 h-4 text-[#4E6053]" />
          <span>行程画卷列表 ({{ trips.length }})</span>
        </h3>
      </div>

      <!-- Loading skeleton -->
      <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          v-for="i in 3"
          :key="i"
          class="h-44 rounded-2xl bg-white border border-[#E5E1D8] p-5 animate-pulse space-y-3"
        >
          <div class="h-4 bg-[#EFECE4] rounded w-1/3"></div>
          <div class="h-6 bg-[#EFECE4] rounded w-2/3"></div>
          <div class="h-10 bg-[#EFECE4]/60 rounded w-full"></div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="trips.length === 0"
        class="rounded-2xl border border-dashed border-[#D4CEBF] bg-white/60 p-12 text-center"
      >
        <CompassIcon class="w-10 h-10 text-[#9E9B93] mx-auto mb-2" />
        <h4 class="font-serif text-base font-medium text-[#1D1C1A]">暂无旅行足迹记录</h4>
        <p class="text-xs text-[#747169] mt-1 max-w-sm mx-auto">
          {{ searchKeyword ? '没有找到匹配的行程记录。' : '尚未收录任何行程点位，管理员可点击“标记新足迹”绘制探索路线图。' }}
        </p>
      </div>

      <!-- Trip Cards List -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          v-for="trip in trips"
          :key="trip.id"
          class="group rounded-2xl border p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between"
          :class="[
            activeTrip?.id === trip.id
              ? 'border-[#C25438] bg-[#FDF8F6] shadow-sm'
              : 'border-[#E5E1D8] bg-white hover:border-[#D4CEBF] hover:shadow-md hover:-translate-y-0.5',
          ]"
          @click="selectTrip(trip)"
        >
          <div>
            <!-- Top Badges -->
            <div class="flex items-center justify-between text-xs text-[#747169] mb-3">
              <span class="inline-flex items-center gap-1 font-mono text-[11px] text-[#4E6053]">
                <CalendarIcon class="w-3.5 h-3.5" />
                <span>{{ formatDateRange(trip) }}</span>
              </span>
              <div class="flex items-center gap-1.5">
                <span
                  v-if="trip.visibility === 'private'"
                  class="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-mono text-amber-800 border border-amber-200"
                >
                  私密
                </span>
                <span
                  v-if="trip.countryCode"
                  class="rounded-md bg-[#F7F5F0] px-2 py-0.5 text-[10px] font-mono text-[#747169] border border-[#E5E1D8]"
                >
                  {{ trip.countryCode }}
                </span>
                <div
                  v-if="authStore.isAdmin"
                  class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  @click.stop
                >
                  <button
                    type="button"
                    class="p-1 rounded-md text-[#747169] hover:text-[#C25438] hover:bg-white"
                    @click="openEditTripModal(trip)"
                    title="编辑行程"
                  >
                    <PencilIcon class="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    class="p-1 rounded-md text-[#747169] hover:text-red-600 hover:bg-red-50"
                    @click="handleDeleteTrip(trip.id)"
                    title="删除行程"
                  >
                    <Trash2Icon class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Title & City -->
            <h4
              class="font-serif text-base font-medium transition-colors"
              :class="activeTrip?.id === trip.id ? 'text-[#C25438]' : 'text-[#1D1C1A] group-hover:text-[#C25438]'"
            >
              {{ trip.title }}
            </h4>
            <p v-if="trip.citySummary" class="mt-1 text-[11px] font-mono text-[#4E6053]">
              {{ trip.citySummary }}
            </p>
            <p v-if="trip.summary" class="mt-2 text-xs text-[#747169] line-clamp-2 leading-relaxed">
              {{ trip.summary }}
            </p>
          </div>

          <!-- Bottom Meta -->
          <div class="mt-4 pt-3 border-t border-[#F0ECE1] flex items-center justify-between text-xs font-mono text-[#747169]">
            <span class="flex items-center gap-2 text-[11px]">
              <span>{{ trip.locations?.length || 0 }} 节点</span>
              <span v-if="trip.distanceKm">&middot; {{ trip.distanceKm.toFixed(1) }} km</span>
            </span>
            <span
              class="text-[11px] font-medium"
              :class="activeTrip?.id === trip.id ? 'text-[#C25438]' : 'text-[#9E9B93] group-hover:text-[#1D1C1A]'"
            >
              {{ activeTrip?.id === trip.id ? '当前聚焦' : '查看航迹 ->' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="hasMore" class="pt-2 text-center">
        <button
          type="button"
          :disabled="isLoadingMore"
          class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white hover:bg-[#F7F5F0] border border-[#E5E1D8] text-xs font-medium text-[#1D1C1A] shadow-xs transition-all disabled:opacity-50"
          @click="loadTrips(false)"
        >
          <Loader2Icon v-if="isLoadingMore" class="w-3.5 h-3.5 animate-spin text-[#4E6053]" />
          <span>{{ isLoadingMore ? '加载更多行程...' : '加载更多行程' }}</span>
        </button>
      </div>
    </div>

    <!-- Create / Edit Trip Modal with Interactive Map Coordinate Picker -->
    <Teleport to="body">
      <div
        v-if="isTripModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
      >
        <div class="fixed inset-0 bg-[#1D1C1A]/40 backdrop-blur-xs" @click="isTripModalOpen = false"></div>
        <div class="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl border border-[#E5E1D8] bg-[#F7F5F0] shadow-2xl overflow-hidden">
          <div class="flex items-center justify-between border-b border-[#E5E1D8] px-6 py-4 bg-white">
            <h3 class="font-serif text-lg font-medium text-[#1D1C1A] flex items-center gap-2">
              <CompassIcon class="w-4 h-4 text-[#4E6053]" />
              <span>{{ editingTripId ? '编辑旅行足迹' : '记录全新旅行足迹' }}</span>
            </h3>
            <button
              type="button"
              class="rounded-lg p-1.5 text-[#747169] hover:text-[#1D1C1A] hover:bg-[#EFECE4]"
              @click="isTripModalOpen = false"
            >
              <XIcon class="w-5 h-5" />
            </button>
          </div>

          <form @submit.prevent="handleSaveTrip" class="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="sm:col-span-2">
                <label class="block text-[#1D1C1A] mb-1 font-medium">旅行名称 *</label>
                <input
                  v-model="tripForm.title"
                  type="text"
                  required
                  placeholder="例如：日本关西红叶巡礼 2026"
                  class="w-full rounded-xl bg-white border border-[#E5E1D8] px-3.5 py-2 text-sm text-[#1D1C1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#4E6053]"
                />
              </div>

              <div>
                <label class="block text-[#1D1C1A] mb-1 font-medium">出发日期 *</label>
                <input
                  v-model="startDateStr"
                  type="date"
                  required
                  class="w-full rounded-xl bg-white border border-[#E5E1D8] px-3 py-2 text-[#1D1C1A] font-mono focus:outline-none focus:border-[#4E6053]"
                />
              </div>
              <div>
                <label class="block text-[#1D1C1A] mb-1 font-medium">返程日期 *</label>
                <input
                  v-model="endDateStr"
                  type="date"
                  required
                  class="w-full rounded-xl bg-white border border-[#E5E1D8] px-3 py-2 text-[#1D1C1A] font-mono focus:outline-none focus:border-[#4E6053]"
                />
              </div>

              <div>
                <label class="block text-[#1D1C1A] mb-1 font-medium">国家/地区码</label>
                <input
                  v-model="tripForm.countryCode"
                  type="text"
                  placeholder="例如：JPN 或 CHN"
                  class="w-full rounded-xl bg-white border border-[#E5E1D8] px-3.5 py-2 text-[#1D1C1A] font-mono focus:outline-none focus:border-[#4E6053]"
                />
              </div>
              <div>
                <label class="block text-[#1D1C1A] mb-1 font-medium">城市简述</label>
                <input
                  v-model="tripForm.citySummary"
                  type="text"
                  placeholder="例如：京都 · 大阪 · 奈良"
                  class="w-full rounded-xl bg-white border border-[#E5E1D8] px-3.5 py-2 text-[#1D1C1A] focus:outline-none focus:border-[#4E6053]"
                />
              </div>

              <div>
                <label class="block text-[#1D1C1A] mb-1 font-medium">可见权限</label>
                <select
                  v-model="tripForm.visibility"
                  class="w-full rounded-xl bg-white border border-[#E5E1D8] px-3 py-2 text-[#1D1C1A] focus:outline-none focus:border-[#4E6053]"
                >
                  <option value="public">公开策展 (Public)</option>
                  <option value="private">私密仅己可见 (Private)</option>
                </select>
              </div>
              <div>
                <label class="block text-[#1D1C1A] mb-1 font-medium">标签 (逗号分隔)</label>
                <input
                  v-model="tripTagsInput"
                  type="text"
                  placeholder="例如：旅行, 摄影, 徒步"
                  class="w-full rounded-xl bg-white border border-[#E5E1D8] px-3.5 py-2 text-[#1D1C1A] focus:outline-none focus:border-[#4E6053]"
                />
              </div>
            </div>

            <div>
              <label class="block text-[#1D1C1A] mb-1 font-medium">行程概述</label>
              <textarea
                v-model="tripForm.summary"
                rows="2"
                placeholder="记录本次旅途的主要亮点与路线..."
                class="w-full rounded-xl bg-white border border-[#E5E1D8] px-3.5 py-2 text-[#1D1C1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#4E6053]"
              ></textarea>
            </div>

            <!-- Interactive Map Picker & Custom Waypoints -->
            <div class="rounded-2xl border border-[#E5E1D8] bg-white p-4 space-y-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="font-medium text-[#1D1C1A]">打卡节点编辑器 (在地图点击拾取坐标或手动添加)</span>
                <div class="flex items-center gap-2">
                  <button
                    v-for="preset in presets"
                    :key="preset.name"
                    type="button"
                    class="px-2.5 py-1 rounded-lg border border-[#E5E1D8] bg-[#F7F5F0] text-[11px] text-[#747169] hover:border-[#4E6053] hover:text-[#1D1C1A]"
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

              <!-- Add Custom Waypoint Row -->
              <div class="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                <input
                  v-model="draftWaypoint.name"
                  type="text"
                  placeholder="地点名称 *"
                  class="sm:col-span-4 rounded-lg bg-[#F7F5F0] border border-[#E5E1D8] px-2.5 py-1.5 text-xs"
                />
                <input
                  v-model.number="draftWaypoint.latitude"
                  type="number"
                  step="any"
                  placeholder="纬度 (-90~90)"
                  class="sm:col-span-2 rounded-lg bg-[#F7F5F0] border border-[#E5E1D8] px-2.5 py-1.5 text-xs font-mono"
                />
                <input
                  v-model.number="draftWaypoint.longitude"
                  type="number"
                  step="any"
                  placeholder="经度 (-180~180)"
                  class="sm:col-span-2 rounded-lg bg-[#F7F5F0] border border-[#E5E1D8] px-2.5 py-1.5 text-xs font-mono"
                />
                <input
                  v-model="draftWaypoint.notes"
                  type="text"
                  placeholder="备注 (可选)"
                  class="sm:col-span-3 rounded-lg bg-[#F7F5F0] border border-[#E5E1D8] px-2.5 py-1.5 text-xs"
                />
                <button
                  type="button"
                  class="sm:col-span-1 rounded-lg bg-[#4E6053] text-white px-2.5 py-1.5 font-medium hover:bg-[#3D4C41]"
                  @click="addDraftWaypoint"
                >
                  添加
                </button>
              </div>

              <!-- Current Waypoints List -->
              <div v-if="tripForm.locations.length > 0" class="space-y-1.5 max-h-40 overflow-y-auto pt-1">
                <div
                  v-for="(loc, idx) in tripForm.locations"
                  :key="idx"
                  class="flex items-center justify-between gap-2 rounded-lg border border-[#E5E1D8] bg-[#F7F5F0]/70 px-3 py-1.5"
                >
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="font-mono text-[10px] text-[#4E6053] font-semibold">#{{ idx + 1 }}</span>
                    <span class="font-medium text-[#1D1C1A] truncate">{{ loc.name }}</span>
                    <span class="font-mono text-[10px] text-[#9E9B93]">({{ loc.latitude.toFixed(4) }}, {{ loc.longitude.toFixed(4) }})</span>
                    <span v-if="loc.notes" class="text-[11px] text-[#747169] truncate hidden sm:inline">· {{ loc.notes }}</span>
                  </div>
                  <button
                    type="button"
                    class="text-[#9E9B93] hover:text-[#C25438] p-1"
                    @click="removeWaypoint(idx)"
                    title="移除节点"
                  >
                    <XIcon class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E1D8]">
              <button
                type="button"
                class="px-4 py-2 rounded-xl text-[#747169] hover:text-[#1D1C1A] hover:bg-[#EFECE4]"
                @click="isTripModalOpen = false"
              >
                取消
              </button>
              <button
                type="submit"
                :disabled="isSubmitting"
                class="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#4E6053] text-white font-medium hover:bg-[#3D4C41] transition-colors shadow-xs disabled:opacity-50"
              >
                <Loader2Icon v-if="isSubmitting" class="w-3.5 h-3.5 animate-spin" />
                <span>{{ editingTripId ? '保存修改' : '确认保存路线' }}</span>
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
  Compass as CompassIcon,
  MapPinPlus as MapPinPlusIcon,
  Calendar as CalendarIcon,
  MapPin as MapPinIcon,
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
