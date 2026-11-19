<template>
  <div class="relative w-full overflow-hidden rounded-xl border border-[#E5E1D8] bg-[#EFECE4]">
    <!-- Map Container Target -->
    <div
      ref="mapContainerRef"
      :style="{ height: height || '440px' }"
      class="w-full z-10"
      :class="pickMode ? 'cursor-crosshair' : ''"
    ></div>

    <!-- Pick Mode Helper Banner -->
    <div
      v-if="pickMode"
      class="absolute top-3 left-1/2 -translate-x-1/2 z-20 rounded-full bg-[#1D1C1A]/90 px-3.5 py-1.5 text-[11px] font-mono text-[#F7F5F0] shadow-md backdrop-blur-md pointer-events-none"
    >
      点击地图任意位置以拾取经纬度坐标
    </div>

    <!-- Map Tile Source Switcher -->
    <div
      class="absolute top-2.5 right-2.5 z-20 inline-flex rounded-lg bg-[#F7F5F0]/92 p-0.5 border border-[#E5E1D8] backdrop-blur-md shadow-xs text-[10px] font-mono"
    >
      <button
        type="button"
        class="px-2 py-1 rounded-md transition-colors"
        :class="tileProvider === 'autonavi' ? 'bg-[#4E6053] text-white font-semibold' : 'text-[#747169] hover:text-[#1D1C1A]'"
        @click="switchTileProvider('autonavi')"
      >
        国内地图
      </button>
      <button
        type="button"
        class="px-2 py-1 rounded-md transition-colors"
        :class="tileProvider === 'osm' ? 'bg-[#4E6053] text-white font-semibold' : 'text-[#747169] hover:text-[#1D1C1A]'"
        @click="switchTileProvider('osm')"
      >
        OSM
      </button>
    </div>

    <!-- Map Attribution Badge -->
    <div
      class="absolute bottom-2.5 left-2.5 z-20 pointer-events-none rounded-lg bg-[#F7F5F0]/90 px-2.5 py-1 text-[10px] font-mono text-[#747169] border border-[#E5E1D8] backdrop-blur-md shadow-xs"
    >
      <span>{{ tileProvider === 'autonavi' ? '高德国内直连矢量底图 · 零 Key' : 'OpenStreetMap 开源矢量瓦片' }}</span>
    </div>

    <!-- Loading Placeholder until Map initializes -->
    <div
      v-if="!isMapReady"
      class="absolute inset-0 z-30 flex items-center justify-center bg-[#F7F5F0]/95 text-[#747169]"
    >
      <div class="flex items-center gap-2 text-xs font-mono">
        <CompassIcon class="w-4 h-4 text-[#4E6053] animate-spin" />
        <span>正在加载地理档案图谱...</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { Compass as CompassIcon } from 'lucide-vue-next';
import { escapeHtml } from '@/shared/utils/markdown';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description?: string;
  time?: string | number;
}

const props = withDefaults(
  defineProps<{
    markers?: MapMarker[];
    polyline?: [number, number][];
    center?: [number, number];
    zoom?: number;
    height?: string;
    pickMode?: boolean;
  }>(),
  {
    markers: () => [],
    polyline: () => [],
    center: () => [34.3416, 108.9398],
    zoom: 4,
    height: '440px',
    pickMode: false,
  }
);

const emit = defineEmits<{
  (e: 'marker-click', marker: MapMarker): void;
  (e: 'map-click', coords: { lat: number; lng: number }): void;
}>();

const mapContainerRef = ref<HTMLElement | null>(null);
const isMapReady = ref(false);
const tileProvider = ref<'autonavi' | 'osm'>('autonavi');

let mapInstance: any = null;
let leafletLib: any = null;
let tileLayer: any = null;
let markerLayerGroup: any = null;
let polylineLayer: any = null;
let resizeObserver: ResizeObserver | null = null;

function applyTileLayer(provider: 'autonavi' | 'osm') {
  if (!mapInstance || !leafletLib) return;
  const L = leafletLib;
  if (tileLayer) {
    mapInstance.removeLayer(tileLayer);
  }
  if (provider === 'autonavi') {
    tileLayer = L.tileLayer(
      'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8',
      {
        subdomains: ['1', '2', '3', '4'],
        maxZoom: 18,
        attribution: '&copy; AutoNavi',
      }
    ).addTo(mapInstance);
  } else {
    tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(mapInstance);
  }
}

function switchTileProvider(provider: 'autonavi' | 'osm') {
  if (tileProvider.value === provider) return;
  tileProvider.value = provider;
  applyTileLayer(provider);
}

async function initMap() {
  if (typeof window === 'undefined' || !mapContainerRef.value) return;

  try {
    const L = await import('leaflet');
    leafletLib = L;
    await import('leaflet/dist/leaflet.css');

    mapInstance = L.map(mapContainerRef.value, {
      center: props.center,
      zoom: props.zoom,
      zoomControl: true,
      attributionControl: true,
    });

    applyTileLayer(tileProvider.value);

    markerLayerGroup = L.layerGroup().addTo(mapInstance);

    mapInstance.on('click', (e: any) => {
      if (props.pickMode && e?.latlng) {
        emit('map-click', {
          lat: Number(e.latlng.lat.toFixed(5)),
          lng: Number(e.latlng.lng.toFixed(5)),
        });
      }
    });

    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.value) {
      resizeObserver = new ResizeObserver(() => {
        mapInstance?.invalidateSize();
      });
      resizeObserver.observe(mapContainerRef.value);
    }

    renderFeatures();
    isMapReady.value = true;
    window.setTimeout(() => mapInstance?.invalidateSize(), 120);
  } catch (err) {
    console.error('Failed to initialize Leaflet Map:', err);
  }
}

function renderFeatures() {
  if (!mapInstance || !leafletLib) return;
  const L = leafletLib;

  markerLayerGroup.clearLayers();
  if (polylineLayer) {
    mapInstance.removeLayer(polylineLayer);
    polylineLayer = null;
  }

  const boundsLatLngs: [number, number][] = [];

  if (props.polyline && props.polyline.length > 1) {
    polylineLayer = L.polyline(props.polyline, {
      color: '#C25438',
      weight: 3,
      opacity: 0.85,
      dashArray: '7, 7',
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(mapInstance);

    for (const pt of props.polyline) {
      boundsLatLngs.push(pt);
    }
  }

  const createCustomIcon = (index: number) => {
    return L.divIcon({
      className: 'custom-footprint-marker',
      html: `
        <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; inset: 2px; border-radius: 9999px; background-color: rgba(78, 96, 83, 0.28); animation: archivePing 2.4s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 22px; height: 22px; border-radius: 9999px; background-color: #4E6053; border: 2px solid #F7F5F0; box-shadow: 0 3px 8px rgba(29,28,26,0.28); display: flex; align-items: center; justify-content: center; color: #FFFFFF; font-size: 10px; font-weight: 600; font-family: 'JetBrains Mono', monospace;">
            ${index + 1}
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });
  };

  if (props.markers && props.markers.length > 0) {
    props.markers.forEach((m, idx) => {
      boundsLatLngs.push([m.lat, m.lng]);

      const marker = L.marker([m.lat, m.lng], {
        icon: createCustomIcon(idx),
        title: m.title,
      });

      const safeTitle = escapeHtml(m.title);
      const safeDesc = m.description ? escapeHtml(m.description) : '';
      const safeTime = m.time !== undefined && m.time !== null ? escapeHtml(String(m.time)) : '';

      const popupHtml = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 160px; padding: 2px;">
          <h4 style="margin: 0; font-size: 13px; font-weight: 600; color: #1D1C1A;">${safeTitle}</h4>
          ${safeDesc ? `<p style="margin: 4px 0 0; font-size: 11px; color: #747169; line-height: 1.4;">${safeDesc}</p>` : ''}
          ${safeTime ? `<div style="margin-top: 4px; font-size: 10px; color: #C25438; font-family: monospace;">${safeTime}</div>` : ''}
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('click', () => {
        emit('marker-click', m);
      });

      markerLayerGroup.addLayer(marker);
    });
  }

  if (boundsLatLngs.length > 0) {
    mapInstance.fitBounds(boundsLatLngs, {
      padding: [40, 40],
      maxZoom: 13,
    });
  }
}

watch(
  () => [props.markers, props.polyline],
  () => {
    if (isMapReady.value) {
      renderFeatures();
    }
  },
  { deep: true }
);

onMounted(() => {
  initMap();
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
});
</script>

<style>
@keyframes archivePing {
  75%, 100% {
    transform: scale(1.9);
    opacity: 0;
  }
}
</style>
