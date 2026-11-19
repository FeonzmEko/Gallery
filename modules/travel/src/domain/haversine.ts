import type { Coordinates } from './coordinates.js';

export const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates the great-circle distance between two coordinates using the Haversine formula.
 * Returns distance in kilometers, rounded to 2 decimal places.
 */
export function haversineDistance(pointA: Coordinates, pointB: Coordinates): number {
  if (pointA.latitude === pointB.latitude && pointA.longitude === pointB.longitude) {
    return 0;
  }

  const phi1 = toRadians(pointA.latitude);
  const phi2 = toRadians(pointB.latitude);
  const deltaPhi = toRadians(pointB.latitude - pointA.latitude);
  const deltaLambda = toRadians(pointB.longitude - pointA.longitude);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  // Guard against slight floating point inaccuracies exceeding 1
  const c = 2 * Math.atan2(Math.sqrt(Math.min(1, a)), Math.sqrt(Math.max(0, 1 - a)));

  const distance = EARTH_RADIUS_KM * c;
  return Math.round(distance * 100) / 100;
}

/**
 * Computes the total cumulative route distance for an ordered sequence of coordinates.
 */
export function calculateTotalRouteDistance(points: Coordinates[]): number {
  if (!points || points.length < 2) {
    return 0;
  }

  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += haversineDistance(points[i], points[i + 1]);
  }

  return Math.round(total * 100) / 100;
}
