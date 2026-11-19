import type {
  TripLocationDto,
  GeoJsonFeatureCollection,
  GeoJsonPointFeature,
  GeoJsonLineStringFeature,
  LeafletLatLng,
  LeafletBounds,
} from './types.js';

/**
 * Builds GeoJSON RFC 7946 FeatureCollection and Leaflet coordinates
 * from an ordered array of trip locations.
 */
export function buildTripGeoData(
  locations: TripLocationDto[],
  totalDistanceKm: number
): {
  geoJson: GeoJsonFeatureCollection;
  leafletPolyline: LeafletLatLng[];
  bounds: LeafletBounds | null;
} {
  const features: (GeoJsonPointFeature | GeoJsonLineStringFeature)[] = [];
  const leafletPolyline: LeafletLatLng[] = [];
  const lineCoordinates: [number, number][] = [];

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const loc of locations) {
    // GeoJSON point uses [longitude, latitude] order
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [loc.longitude, loc.latitude],
      },
      properties: {
        id: loc.id,
        name: loc.name,
        visitedAt: loc.visitedAt,
        sortOrder: loc.sortOrder,
        notes: loc.notes,
      },
    });

    // Leaflet LatLng uses [latitude, longitude] order
    leafletPolyline.push([loc.latitude, loc.longitude]);
    lineCoordinates.push([loc.longitude, loc.latitude]);

    if (loc.latitude < minLat) minLat = loc.latitude;
    if (loc.latitude > maxLat) maxLat = loc.latitude;
    if (loc.longitude < minLng) minLng = loc.longitude;
    if (loc.longitude > maxLng) maxLng = loc.longitude;
  }

  // If there are 2 or more locations, create a LineString feature representing the travel track
  if (lineCoordinates.length >= 2) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: lineCoordinates,
      },
      properties: {
        totalDistanceKm,
        stopCount: locations.length,
      },
    });
  }

  const bounds: LeafletBounds | null =
    locations.length > 0
      ? [
          [minLat, minLng],
          [maxLat, maxLng],
        ]
      : null;

  return {
    geoJson: {
      type: 'FeatureCollection',
      features,
    },
    leafletPolyline,
    bounds,
  };
}
