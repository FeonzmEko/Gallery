import { z } from 'zod';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export const LatitudeSchema = z
  .number({ invalid_type_error: '纬度必须为有效数字' })
  .min(-90, '纬度范围必须在 -90 到 90 之间')
  .max(90, '纬度范围必须在 -90 到 90 之间');

export const LongitudeSchema = z
  .number({ invalid_type_error: '经度必须为有效数字' })
  .min(-180, '经度范围必须在 -180 到 180 之间')
  .max(180, '经度范围必须在 -180 到 180 之间');

export const CoordinatesSchema = z.object({
  latitude: LatitudeSchema,
  longitude: LongitudeSchema,
});

/**
 * Validates whether the given latitude and longitude form valid WGS84 coordinates.
 */
export function isValidCoordinates(latitude: number, longitude: number): boolean {
  return (
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === 'number' &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}
