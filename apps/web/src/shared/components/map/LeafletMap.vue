<template>
  <div class="archival-map relative w-full overflow-hidden rounded-[2px] border border-[#DDD6C9] bg-[#EAE4D8]">
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
      class="absolute top-3 left-1/2 -translate-x-1/2 z-20 rounded-[2px] bg-[#161513]/90 px-4 py-1.5 text-[10px] font-mono tracking-[0.14em] uppercase text-[#FAF8F4] border border-white/10 pointer-events-none"
    >
      点击地图任意位置以拾取经纬度坐标
    </div>

    <!-- Map Tile Source Switcher -->
    <div
      class="absolute top-3 right-3 z-20 inline-flex rounded-[2px] bg-[#FAF8F4]/95 border border-[#DDD6C9] text-[10px] font-mono tracking-[0.12em]"
    >
      <button
        type="button"
        class="px-2.5 py-1 transition-colors"
        :class="tileProvider === 'osm' ? 'bg-[#161513] text-[#FAF8F4]' : 'text-[#57534C] hover:text-[#161513]'"
        @click="switchTileProvider('osm')"
      >
        OSM 图集
      </button>
      <button
        type="button"
        class="px-2.5 py-1 border-l border-[#DDD6C9] transition-colors"
        :class="tileProvider === 'autonavi' ? 'bg-[#161513] text-[#FAF8F4]' : 'text-[#57534C] hover:text-[#161513]'"
        @click="switchTileProvider('autonavi')"
      >
        高德底图
      </button>
    </div>

    <!-- Cartographic Attribution Stamp -->
    <div
      class="absolute bottom-3 left-3 z-20 pointer-events-none rounded-[2px] bg-[#FAF8F4]/92 px-2.5 py-1 text-[10px] font-mono tracking-[0.1em] text-[#57534C] border border-[#DDD6C9]"
    >
      <span>
        {{ tileProvider === 'osm' ? 'CARTOGRAPHY · OPENSTREETMAP' : 'CARTOGRAPHY · AUTONAVI' }}
      </span>
    </div>

    <!-- Loading Placeholder until Map initializes -->
    <div
      v-if="!isMapReady"
      class="absolute inset-0 z-30 flex items-center justify-center bg-[#F3EFE7]/95 text-[#787268]"
    >
      <div class="flex items-center gap-2.5 text-[11px] font-mono tracking-[0.14em] uppercase">
        <CompassIcon class="w-4 h-4 text-[#3D4E42] animate-spin" />
        <span>Loading Cartography Plate...</span>
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

type TileProvider = 'osm' | 'autonavi';

const mapContainerRef = ref<HTMLElement | null>(null);
const isMapReady = ref(false);
const tileProvider = ref<TileProvider>('osm');

let mapInstance: any = null;
let leafletLib: any = null;
let tileLayer: any = null;
let markerLayerGroup: any = null;
let polylineLayer: any = null;
let resizeObserver: ResizeObserver | null = null;

function applyTileLayer(provider: TileProvider) {
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

function switchTileProvider(provider: TileProvider) {
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
      color: '#9A3F2B',
      weight: 2.2,
      opacity: 0.85,
      dashArray: '6, 6',
      lineCap: 'square',
      lineJoin: 'miter',
    }).addTo(mapInstance);

    for (const pt of props.polyline) {
      boundsLatLngs.push(pt);
    }
  }

  const createCustomIcon = (index: number) => {
    return L.divIcon({
      className: 'custom-footprint-marker',
      html: `
        <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
          <div style="position: relative; width: 22px; height: 22px; border-radius: 2px; background-color: #161513; border: 1.5px solid #FAF8F4; box-shadow: 0 4px 10px rgba(22,21,19,0.28); display: flex; align-items: center; justify-content: center; color: #FAF8F4; font-size: 10px; font-weight: 500; font-family: 'JetBrains Mono', monospace;">
            ${index + 1}
          </div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14],
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
        <div style="font-family: 'Noto Serif SC', Georgia, serif; min-width: 160px; padding: 2px;">
          <h4 style="margin: 0; font-size: 13px; font-weight: 500; color: #161513;">${safeTitle}</h4>
          ${safeDesc ? `<p style="margin: 4px 0 0; font-size: 11px; color: #57534C; line-height: 1.5;">${safeDesc}</p>` : ''}
          ${safeTime ? `<div style="margin-top: 4px; font-size: 10px; color: #9A3F2B; font-family: 'JetBrains Mono', monospace;">${safeTime}</div>` : ''}
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
