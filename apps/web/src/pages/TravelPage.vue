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
        <h1 class="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-[#1D1C1A] flex items-center gap-3">
          <span>足迹漫游</span>
        </h1>
        <p class="mt-1 text-sm text-[#747169] font-serif italic">
          “丈量山海与城郭，以经纬点位串联起生命旅途中的行走轨迹。”
        </p>
      </div>

      <!-- Admin write actions -->
      <div v-if="authStore.isAdmin" class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-[#4E6053] px-4 py-2 text-xs font-semibold text-white hover:bg-[#3D4C41] shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          @click="openCreateTripModal"
        >
          <MapPinPlusIcon class="w-3.5 h-3.5" />
          <span>标记新足迹</span>
        </button>
      </div>
    </div>

    <!-- Leaflet OpenStreetMap Interactive Map Mat Board -->
    <div class="bg-white p-2 sm:p-3 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-2">
      <div class="flex items-center justify-between text-xs text-[#747169] px-2 py-1">
        <span class="flex items-center gap-2 font-mono text-[11px]">
          <span class="h-2 w-2 rounded-full bg-[#4E6053] animate-pulse"></span>
          <span>当前轨迹：<strong class="text-[#1D1C1A] font-medium">{{ activeTrip?.title || '全部足迹聚合' }}</strong></span>
        </span>
        <span v-if="activeMarkers.length > 0" class="font-mono text-[#9E9B93] text-[11px]">
          {{ activeMarkers.length }} 个足迹地点 · {{ activePolyline.length }} 节点路径
        </span>
      </div>

      <div class="rounded-xl overflow-hidden border border-[#E5E1D8]">
        <LeafletMap
          :markers="activeMarkers"
          :polyline="activePolyline"
          height="440px"
          @marker-click="handleMarkerClick"
        />
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
          尚未收录任何行程点位，点击“标记新足迹”绘制您的第一张探索路线图。
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
              <span
                v-if="trip.countryCode"
                class="rounded-md bg-[#F7F5F0] px-2 py-0.5 text-[10px] font-mono text-[#747169] border border-[#E5E1D8]"
              >
                {{ trip.countryCode }}
              </span>
            </div>

            <!-- Title & Summary -->
            <h4
              class="font-serif text-base font-medium transition-colors"
              :class="activeTrip?.id === trip.id ? 'text-[#C25438]' : 'text-[#1D1C1A] group-hover:text-[#C25438]'"
            >
              {{ trip.title }}
            </h4>
            <p v-if="trip.summary" class="mt-2 text-xs text-[#747169] line-clamp-2 leading-relaxed">
              {{ trip.summary }}
            </p>
          </div>

          <!-- Bottom Meta -->
          <div class="mt-4 pt-3 border-t border-[#F0ECE1] flex items-center justify-between text-xs font-mono text-[#747169]">
            <span class="flex items-center gap-1 text-[11px]">
              <MapPinIcon class="w-3.5 h-3.5 text-[#4E6053]" />
              <span>{{ trip.locations?.length || 0 }} 个打卡地点</span>
            </span>
            <span
              class="text-[11px] font-medium"
              :class="activeTrip?.id === trip.id ? 'text-[#C25438]' : 'text-[#9E9B93] group-hover:text-[#1D1C1A]'"
            >
              {{ activeTrip?.id === trip.id ? '当前激活' : '查看路线 →' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Trip Modal -->
    <div
      v-if="isCreateModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="isCreateModalOpen = false"></div>
      <div class="relative w-full max-w-lg rounded-2xl border border-[#E5E1D8] bg-white shadow-2xl p-6 overflow-hidden">
        <div class="flex items-center justify-between border-b border-[#E5E1D8] pb-4 mb-4">
          <h3 class="font-serif text-lg font-medium text-[#1D1C1A] flex items-center gap-2">
            <CompassIcon class="w-4 h-4 text-[#4E6053]" />
            <span>记录全新旅行足迹</span>
          </h3>
          <button
            type="button"
            class="text-[#747169] hover:text-[#1D1C1A]"
            @click="isCreateModalOpen = false"
          >
            ✕
          </button>
        </div>

        <form @submit.prevent="handleCreateTrip" class="space-y-4 text-xs">
          <div>
            <label class="block text-[#1D1C1A] mb-1 font-medium">旅行名称 *</label>
            <input
              v-model="newTrip.title"
              type="text"
              required
              placeholder="例如：日本关西红叶巡礼 2026"
              class="w-full rounded-xl bg-[#F7F5F0] border border-[#E5E1D8] px-3.5 py-2 text-[#1D1C1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#4E6053] focus:bg-white transition-colors"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[#1D1C1A] mb-1 font-medium">国家/地区码</label>
              <input
                v-model="newTrip.countryCode"
                type="text"
                placeholder="例如：JPN 或 CHN"
                class="w-full rounded-xl bg-[#F7F5F0] border border-[#E5E1D8] px-3.5 py-2 text-[#1D1C1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#4E6053] focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label class="block text-[#1D1C1A] mb-1 font-medium">城市简述</label>
              <input
                v-model="newTrip.citySummary"
                type="text"
                placeholder="例如：京都 / 大阪 / 奈良"
                class="w-full rounded-xl bg-[#F7F5F0] border border-[#E5E1D8] px-3.5 py-2 text-[#1D1C1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#4E6053] focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label class="block text-[#1D1C1A] mb-1 font-medium">行程概述</label>
            <textarea
              v-model="newTrip.summary"
              rows="2"
              placeholder="记录本次旅途的主要亮点与路线..."
              class="w-full rounded-xl bg-[#F7F5F0] border border-[#E5E1D8] px-3.5 py-2 text-[#1D1C1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#4E6053] focus:bg-white transition-colors"
            ></textarea>
          </div>

          <!-- Quick Location Presets -->
          <div>
            <label class="block text-[#1D1C1A] mb-1 font-medium">预设打卡点位快速录入</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                v-for="preset in presets"
                :key="preset.name"
                class="p-2.5 rounded-xl border border-[#E5E1D8] bg-[#F7F5F0] text-left hover:border-[#4E6053] hover:bg-white transition-all"
                @click="applyPreset(preset)"
              >
                <div class="font-medium text-[#1D1C1A] truncate">{{ preset.name }}</div>
                <div class="text-[10px] font-mono text-[#747169] mt-0.5">{{ preset.locations.length }} 个路线节点</div>
              </button>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E1D8]">
            <button
              type="button"
              class="px-4 py-2 rounded-xl text-[#747169] hover:text-[#1D1C1A]"
              @click="isCreateModalOpen = false"
            >
              取消
            </button>
            <button
              type="submit"
              class="px-5 py-2 rounded-xl bg-[#4E6053] text-white font-medium hover:bg-[#3D4C41] transition-colors shadow-sm"
            >
              确认保存路线
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  Compass as CompassIcon,
  MapPinPlus as MapPinPlusIcon,
  Calendar as CalendarIcon,
  MapPin as MapPinIcon,
} from 'lucide-vue-next';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { apiClient } from '@/shared/api/client';
import LeafletMap, { type MapMarker } from '@/shared/components/map/LeafletMap.vue';
import { getYear, getMonth } from '@archive/shared';

const authStore = useAuthStore();

interface TripItem {
  id: string;
  title: string;
  summary?: string | null;
  countryCode?: string | null;
  citySummary?: string | null;
  startDate?: number;
  endDate?: number;
  occurredAt?: number;
  locations?: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    visitedAt?: number | null;
    notes?: string | null;
  }>;
}

const isLoading = ref(true);
const trips = ref<TripItem[]>([]);
const activeTrip = ref<TripItem | null>(null);
const isCreateModalOpen = ref(false);

const presets = [
  {
    name: '日本关西巡礼 (京都/奈良/大阪)',
    countryCode: 'JPN',
    citySummary: '京都 · 奈良 · 大阪',
    locations: [
      { id: '1', name: '清水寺 (Kiyomizu-dera)', latitude: 34.9949, longitude: 135.785, notes: '晨曦俯瞰音羽山' },
      { id: '2', name: '伏见稻荷大社 (Fushimi Inari)', latitude: 34.9671, longitude: 135.7727, notes: '千本鸟居红叶漫步' },
      { id: '3', name: '奈良公园 (Nara Park)', latitude: 34.6851, longitude: 135.843, notes: '若草山下萌鹿' },
      { id: '4', name: '道顿堀 (Dotonbori)', latitude: 34.6687, longitude: 135.5013, notes: '心斋桥夜市美食' },
    ],
  },
  {
    name: '川西秘境环线 (成都/康定/新都桥)',
    countryCode: 'CHN',
    citySummary: '成都 · 康定 · 新都桥',
    locations: [
      { id: '1', name: '成都宽窄巷子', latitude: 30.6698, longitude: 104.0535, notes: '天府之国启程' },
      { id: '2', name: '康定折多山', latitude: 30.0768, longitude: 101.8159, notes: '海拔4298米垭口' },
      { id: '3', name: '新都桥光影长廊', latitude: 30.0267, longitude: 101.5238, notes: '摄影家的天堂' },
    ],
  },
];

const newTrip = ref({
  title: '',
  countryCode: '',
  citySummary: '',
  summary: '',
  locations: [] as any[],
});

const activeMarkers = computed<MapMarker[]>(() => {
  if (activeTrip.value && activeTrip.value.locations && activeTrip.value.locations.length > 0) {
    return activeTrip.value.locations.map((loc) => ({
      id: loc.id,
      lat: loc.latitude,
      lng: loc.longitude,
      title: loc.name,
      description: loc.notes ?? undefined,
    }));
  }

  // If no trip selected, aggregate all locations from all trips
  const markers: MapMarker[] = [];
  for (const t of trips.value) {
    if (t.locations) {
      for (const loc of t.locations) {
        markers.push({
          id: loc.id,
          lat: loc.latitude,
          lng: loc.longitude,
          title: `${t.title} - ${loc.name}`,
          description: loc.notes ?? undefined,
        });
      }
    }
  }
  return markers;
});

const activePolyline = computed<[number, number][]>(() => {
  if (activeTrip.value && activeTrip.value.locations && activeTrip.value.locations.length > 1) {
    return activeTrip.value.locations.map((loc) => [loc.latitude, loc.longitude]);
  }
  return [];
});

function selectTrip(trip: TripItem) {
  activeTrip.value = trip;
}

function formatDateRange(trip: TripItem): string {
  const start = trip.startDate || trip.occurredAt || Date.now();
  return `${getYear(start)}.${String(getMonth(start)).padStart(2, '0')}`;
}

function handleMarkerClick(marker: MapMarker) {
  console.log('Selected marker:', marker);
}

function openCreateTripModal() {
  newTrip.value = {
    title: '',
    countryCode: '',
    citySummary: '',
    summary: '',
    locations: [],
  };
  isCreateModalOpen.value = true;
}

function applyPreset(preset: typeof presets[0]) {
  newTrip.value.title = preset.name;
  newTrip.value.countryCode = preset.countryCode;
  newTrip.value.citySummary = preset.citySummary;
  newTrip.value.locations = [...preset.locations];
}

async function loadTrips() {
  isLoading.value = true;
  try {
    // Attempt to load from /api/v1/trips or /api/v1/entries?type=trip
    let data: any[] = [];
    try {
      data = await apiClient.get<any[]>('/api/v1/trips');
    } catch {
      data = await apiClient.get<any[]>('/api/v1/entries', { params: { type: 'trip' } });
    }

    if (data && data.length > 0) {
      trips.value = data;
    } else {
      // Provide initial demo trips if DB has no trip yet
      trips.value = [
        {
          id: 'trip-japan-2026',
          title: '日本关西古都枫叶寻迹',
          summary: '穿梭于千年古刹与山峦红叶之间，记录从京都到大阪的漫游时光。',
          countryCode: 'JPN',
          citySummary: '京都 · 奈良 · 大阪',
          occurredAt: Date.now() - 86400000 * 15,
          locations: presets[0].locations,
        },
        {
          id: 'trip-chuanxi-2026',
          title: '川西高原光影与雪山漫游',
          summary: '翻越折多山垭口，在秋风与金色杨树林中捕捉贡嘎雪山晨光。',
          countryCode: 'CHN',
          citySummary: '成都 · 康定 · 新都桥',
          occurredAt: Date.now() - 86400000 * 45,
          locations: presets[1].locations,
        },
      ];
    }

    if (trips.value.length > 0) {
      activeTrip.value = trips.value[0];
    }
  } catch (err) {
    console.error('Failed to load trips:', err);
  } finally {
    isLoading.value = false;
  }
}

async function handleCreateTrip() {
  try {
    const tripToCreate = {
      title: newTrip.value.title,
      summary: newTrip.value.summary || null,
      countryCode: newTrip.value.countryCode || null,
      citySummary: newTrip.value.citySummary || null,
      startDate: Date.now(),
      endDate: Date.now() + 86400000 * 5,
      locations: newTrip.value.locations,
    };

    let createdTrip: any = null;
    try {
      createdTrip = await apiClient.post('/api/v1/trips', tripToCreate);
    } catch {
      createdTrip = await apiClient.post('/api/v1/entries', {
        type: 'trip',
        title: tripToCreate.title,
        summary: tripToCreate.summary,
        occurredAt: tripToCreate.startDate,
        visibility: 'public',
        status: 'published',
        tags: ['旅行', tripToCreate.countryCode].filter(Boolean),
      });
      createdTrip.locations = tripToCreate.locations;
    }

    trips.value.unshift(createdTrip);
    activeTrip.value = createdTrip;
    isCreateModalOpen.value = false;
  } catch (err: any) {
    alert(err.message || '创建旅行足迹失败');
  }
}

onMounted(() => {
  loadTrips();
});
</script>
