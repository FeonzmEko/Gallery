<template>
  <div class="relative w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-inner">
    <!-- Map Container Target -->
    <div ref="mapContainerRef" :style="{ height: height || '420px' }" class="w-full z-10"></div>

    <!-- Map Overlay Controls / Attribution Badge -->
    <div
      class="absolute bottom-2 left-2 z-20 pointer-events-none rounded-lg bg-slate-950/80 px-2.5 py-1 text-[10px] font-mono text-slate-400 border border-slate-800/80 backdrop-blur-md"
    >
      <span>OpenStreetMap 开源瓦片 · 零商业 Key 依赖</span>
    </div>

    <!-- Loading Placeholder until Map initializes -->
    <div
      v-if="!isMapReady"
      class="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/90 text-slate-400"
    >
      <div class="flex items-center gap-2 text-xs">
        <CompassIcon class="w-5 h-5 text-indigo-400 animate-spin" />
        <span>正在加载 Leaflet 开源地理瓦片...</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { Compass as CompassIcon } from 'lucide-vue-next';

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
  }>(),
  {
    markers: () => [],
    polyline: () => [],
    center: () => [34.3416, 108.9398], // Default central viewpoint
    zoom: 4,
    height: '420px',
  }
);

const emit = defineEmits<{
  (e: 'marker-click', marker: MapMarker): void;
}>();

const mapContainerRef = ref<HTMLElement | null>(null);
const isMapReady = ref(false);

let mapInstance: any = null;
let leafletLib: any = null;
let markerLayerGroup: any = null;
let polylineLayer: any = null;

async function initMap() {
  if (typeof window === 'undefined' || !mapContainerRef.value) return;

  try {
    // Dynamic import to prevent SSR issues
    const L = await import('leaflet');
    leafletLib = L;

    // Load stylesheet
    await import('leaflet/dist/leaflet.css');

    // Create map instance
    mapInstance = L.map(mapContainerRef.value, {
      center: props.center,
      zoom: props.zoom,
      zoomControl: true,
      attributionControl: true,
    });

    // Add free OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(mapInstance);

    markerLayerGroup = L.layerGroup().addTo(mapInstance);

    renderFeatures();
    isMapReady.value = true;
  } catch (err) {
    console.error('Failed to initialize Leaflet Map:', err);
  }
}

function renderFeatures() {
  if (!mapInstance || !leafletLib) return;
  const L = leafletLib;

  // Clear previous markers
  markerLayerGroup.clearLayers();
  if (polylineLayer) {
    mapInstance.removeLayer(polylineLayer);
    polylineLayer = null;
  }

  const boundsLatLngs: [number, number][] = [];

  // 1. Draw glowing trajectory polyline
  if (props.polyline && props.polyline.length > 1) {
    polylineLayer = L.polyline(props.polyline, {
      color: '#6366f1',
      weight: 3.5,
      opacity: 0.85,
      dashArray: '8, 8',
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(mapInstance);

    for (const pt of props.polyline) {
      boundsLatLngs.push(pt);
    }
  }

  // 2. Custom HTML / SVG Pulsing Footprint Marker Icon
  const createCustomIcon = (index: number) => {
    return L.divIcon({
      className: 'custom-footprint-marker',
      html: `
        <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; inset: 0; border-radius: 9999px; background-color: rgba(99, 102, 241, 0.35); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 22px; height: 22px; border-radius: 9999px; background-color: #4f46e5; border: 2px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 10px; font-weight: bold; font-family: monospace;">
            ${index + 1}
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });
  };

  // 3. Render markers
  if (props.markers && props.markers.length > 0) {
    props.markers.forEach((m, idx) => {
      boundsLatLngs.push([m.lat, m.lng]);

      const marker = L.marker([m.lat, m.lng], {
        icon: createCustomIcon(idx),
        title: m.title,
      });

      // Popup balloon
      const popupHtml = `
        <div style="font-family: sans-serif; min-width: 150px; padding: 2px;">
          <h4 style="margin: 0; font-size: 13px; font-weight: 600; color: #0f172a;">${m.title}</h4>
          ${m.description ? `<p style="margin: 4px 0 0; font-size: 11px; color: #475569;">${m.description}</p>` : ''}
          ${m.time ? `<div style="margin-top: 4px; font-size: 10px; color: #6366f1; font-family: monospace;">${m.time}</div>` : ''}
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('click', () => {
        emit('marker-click', m);
      });

      markerLayerGroup.addLayer(marker);
    });
  }

  // 4. Auto adjust view bounds
  if (boundsLatLngs.length > 0) {
    mapInstance.fitBounds(boundsLatLngs, {
      padding: [40, 40],
      maxZoom: 14,
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
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
});
</script>

<style>
@keyframes ping {
  75%, 100% {
    transform: scale(2);
    opacity: 0;
  }
}
</style>
