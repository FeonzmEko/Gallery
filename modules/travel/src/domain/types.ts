import type { EntryDto, Visibility, EntryStatus } from '@archive/contracts';
import type { Coordinates } from './coordinates.js';

export interface TripLocationDto extends Coordinates {
  id: string;
  tripEntryId: string;
  name: string;
  visitedAt: number | null;
  sortOrder: number;
  notes: string | null;
}

export interface GeoJsonPointFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude] in GeoJSON RFC 7946
  };
  properties: {
    id: string;
    name: string;
    visitedAt: number | null;
    sortOrder: number;
    notes: string | null;
  };
}

export interface GeoJsonLineStringFeature {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // [[lon, lat], ...]
  };
  properties: {
    totalDistanceKm: number;
    stopCount: number;
  };
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: (GeoJsonPointFeature | GeoJsonLineStringFeature)[];
}

export type LeafletLatLng = [number, number]; // [lat, lng] format for Leaflet L.polyline() / L.marker()
export type LeafletBounds = [[number, number], [number, number]]; // [[minLat, minLng], [maxLat, maxLng]]

export interface TripRouteDto {
  tripEntryId: string;
  totalDistanceKm: number;
  locations: TripLocationDto[];
  geoJson: GeoJsonFeatureCollection;
  leafletPolyline: LeafletLatLng[];
  bounds: LeafletBounds | null;
}

export interface TripDetailDto extends EntryDto {
  startDate: number;
  endDate: number;
  countryCode: string | null;
  citySummary: string | null;
  distanceKm: number;
  locations: TripLocationDto[];
  geoJson: GeoJsonFeatureCollection;
  leafletPolyline: LeafletLatLng[];
  bounds: LeafletBounds | null;
}

export interface CreateLocationInput {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  visitedAt?: number | null;
  sortOrder?: number;
  notes?: string | null;
}

export interface CreateTripInput {
  id?: string;
  slug?: string | null;
  title: string;
  summary?: string | null;
  startDate: number;
  endDate: number;
  countryCode?: string | null;
  citySummary?: string | null;
  visibility?: Visibility;
  status?: EntryStatus;
  coverMediaId?: string | null;
  tags?: string[];
  locations?: CreateLocationInput[];
}

export interface UpdateTripInput {
  slug?: string | null;
  title?: string;
  summary?: string | null;
  startDate?: number;
  endDate?: number;
  countryCode?: string | null;
  citySummary?: string | null;
  visibility?: Visibility;
  status?: EntryStatus;
  coverMediaId?: string | null;
  tags?: string[];
}
