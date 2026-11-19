import { describe, it, expect, beforeEach } from 'vitest';
import type { AuthUser } from '@archive/contracts';
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ConflictError,
} from '@archive/contracts';
import { isValidCoordinates, CoordinatesSchema } from '../src/domain/coordinates.js';
import { haversineDistance, calculateTotalRouteDistance } from '../src/domain/haversine.js';
import { buildTripGeoData } from '../src/domain/geojson.js';
import { TravelService } from '../src/application/travel.service.js';
import { createTestDatabase } from './test-db.js';

describe('@archive/module-travel', () => {
  describe('Geographic Coordinate Validation', () => {
    it('should validate valid WGS84 coordinates', () => {
      expect(isValidCoordinates(39.9042, 116.4074)).toBe(true); // Beijing
      expect(isValidCoordinates(0, 0)).toBe(true); // Null Island
      expect(isValidCoordinates(-90, -180)).toBe(true); // South pole / antimeridian
      expect(isValidCoordinates(90, 180)).toBe(true); // North pole / antimeridian
    });

    it('should reject invalid coordinates out of bounds', () => {
      expect(isValidCoordinates(91, 0)).toBe(false);
      expect(isValidCoordinates(-90.1, 0)).toBe(false);
      expect(isValidCoordinates(0, 180.1)).toBe(false);
      expect(isValidCoordinates(0, -180.1)).toBe(false);
      expect(isValidCoordinates(NaN, 100)).toBe(false);
    });

    it('should validate coordinates using Zod schema', () => {
      expect(CoordinatesSchema.parse({ latitude: 31.2304, longitude: 121.4737 })).toEqual({
        latitude: 31.2304,
        longitude: 121.4737,
      });

      expect(() => CoordinatesSchema.parse({ latitude: 95, longitude: 0 })).toThrow();
    });
  });

  describe('Haversine Distance Calculation', () => {
    it('should return 0 km for identical coordinates', () => {
      const beijing = { latitude: 39.9042, longitude: 116.4074 };
      expect(haversineDistance(beijing, beijing)).toBe(0);
    });

    it('should calculate accurate distance between Beijing and Shanghai (~1068 km)', () => {
      const beijing = { latitude: 39.9042, longitude: 116.4074 };
      const shanghai = { latitude: 31.2304, longitude: 121.4737 };

      const distance = haversineDistance(beijing, shanghai);
      // Great-circle distance is approx 1068 km (within 1% tolerance)
      expect(distance).toBeGreaterThan(1060);
      expect(distance).toBeLessThan(1080);
    });

    it('should calculate accurate distance between London and Paris (~343 km)', () => {
      const london = { latitude: 51.5074, longitude: -0.1278 };
      const paris = { latitude: 48.8566, longitude: 2.3522 };

      const distance = haversineDistance(london, paris);
      expect(distance).toBeGreaterThan(340);
      expect(distance).toBeLessThan(350);
    });

    it('should compute cumulative route distance for a multi-stop itinerary', () => {
      const beijing = { latitude: 39.9042, longitude: 116.4074 };
      const jinan = { latitude: 36.6512, longitude: 117.1201 };
      const shanghai = { latitude: 31.2304, longitude: 121.4737 };

      const total = calculateTotalRouteDistance([beijing, jinan, shanghai]);
      const leg1 = haversineDistance(beijing, jinan);
      const leg2 = haversineDistance(jinan, shanghai);

      expect(total).toBeCloseTo(leg1 + leg2, 1);
    });
  });

  describe('GeoJSON & Leaflet Map Contract', () => {
    it('should generate GeoJSON points and LineString along with Leaflet polyline', () => {
      const locations = [
        {
          id: 'loc_1',
          tripEntryId: 'trip_1',
          name: '北京故宫',
          latitude: 39.9163,
          longitude: 116.3972,
          visitedAt: 1715000000000,
          sortOrder: 0,
          notes: '壮观古迹',
        },
        {
          id: 'loc_2',
          tripEntryId: 'trip_1',
          name: '天坛公园',
          latitude: 39.8822,
          longitude: 116.4066,
          visitedAt: 1715010000000,
          sortOrder: 1,
          notes: null,
        },
      ];

      const { geoJson, leafletPolyline, bounds } = buildTripGeoData(locations, 4.25);

      // 1. GeoJSON format
      expect(geoJson.type).toBe('FeatureCollection');
      // Should have 2 Point features + 1 LineString feature
      expect(geoJson.features.length).toBe(3);

      const point1 = geoJson.features[0];
      expect(point1.geometry.type).toBe('Point');
      // GeoJSON requires [longitude, latitude]
      expect(point1.geometry.coordinates).toEqual([116.3972, 39.9163]);

      const line = geoJson.features[2];
      expect(line.geometry.type).toBe('LineString');
      expect(line.geometry.coordinates).toEqual([
        [116.3972, 39.9163],
        [116.4066, 39.8822],
      ]);

      // 2. Leaflet LatLng polyline: [latitude, longitude]
      expect(leafletPolyline).toEqual([
        [39.9163, 116.3972],
        [39.8822, 116.4066],
      ]);

      // 3. Leaflet bounds: [[minLat, minLng], [maxLat, maxLng]]
      expect(bounds).toEqual([
        [39.8822, 116.3972],
        [39.9163, 116.4066],
      ]);
    });
  });

  describe('TravelService Core Use Cases', () => {
    let service: TravelService;
    let rawDb: any;
    const adminUser: AuthUser = {
      userId: 'usr_admin01',
      email: 'admin@archive.internal',
      displayName: 'Admin User',
      role: 'admin',
    };
    const guestUser: AuthUser = {
      userId: 'usr_guest01',
      email: 'guest@archive.internal',
      displayName: 'Guest User',
      role: 'user',
    };

    beforeEach(() => {
      const testDb = createTestDatabase();
      service = new TravelService(testDb.db);
      rawDb = testDb.rawDb;

      const now = Date.now();
      rawDb.exec(`
        INSERT INTO users (id, email, display_name, role, created_at, updated_at)
        VALUES ('usr_admin01', 'admin@archive.internal', 'Admin User', 'admin', ${now}, ${now});
      `);
    });

    it('should enforce admin privileges for creating trips', async () => {
      const input = {
        title: '日本关西之行',
        startDate: 1715000000000,
        endDate: 1715500000000,
      };

      await expect(service.createTrip(input, guestUser)).rejects.toThrow(ForbiddenError);
    });

    it('should reject trip where endDate is earlier than startDate', async () => {
      const input = {
        title: '时间倒流之旅',
        startDate: 1715500000000,
        endDate: 1715000000000,
      };

      await expect(service.createTrip(input, adminUser)).rejects.toThrow(ValidationError);
    });

    it('should create trip with locations, calculate distance, and generate GeoJSON', async () => {
      const input = {
        slug: 'beijing-weekend',
        title: '北京周末漫游',
        summary: '秋天的北京最美',
        startDate: 1715000000000,
        endDate: 1715200000000,
        countryCode: 'CN',
        citySummary: '北京',
        tags: ['旅行', '北京'],
        locations: [
          {
            name: '颐和园',
            latitude: 39.9998,
            longitude: 116.2755,
            sortOrder: 0,
          },
          {
            name: '圆明园',
            latitude: 40.0084,
            longitude: 116.2991,
            sortOrder: 1,
          },
        ],
      };

      const result = await service.createTrip(input, adminUser);

      expect(result.id).toBeDefined();
      expect(result.type).toBe('trip');
      expect(result.title).toBe('北京周末漫游');
      expect(result.countryCode).toBe('CN');
      expect(result.citySummary).toBe('北京');
      expect(result.distanceKm).toBeGreaterThan(0);
      expect(result.locations.length).toBe(2);
      expect(result.tags).toEqual(['旅行', '北京']);
      expect(result.geoJson.type).toBe('FeatureCollection');
      expect(result.leafletPolyline.length).toBe(2);
    });

    it('should prevent duplicate slug creation', async () => {
      await service.createTrip(
        {
          slug: 'trip-unique-slug',
          title: '行程 1',
          startDate: 1715000000000,
          endDate: 1715100000000,
        },
        adminUser
      );

      await expect(
        service.createTrip(
          {
            slug: 'trip-unique-slug',
            title: '行程 2',
            startDate: 1715000000000,
            endDate: 1715100000000,
          },
          adminUser
        )
      ).rejects.toThrow(ConflictError);
    });

    it('should get trip and route by ID or slug', async () => {
      const created = await service.createTrip(
        {
          slug: 'kyoto-trip',
          title: '京都秋日行',
          startDate: 1715000000000,
          endDate: 1715500000000,
          countryCode: 'JP',
          locations: [
            {
              name: '金阁寺',
              latitude: 35.0394,
              longitude: 135.7292,
              sortOrder: 0,
            },
            {
              name: '清水寺',
              latitude: 34.9949,
              longitude: 135.785,
              sortOrder: 1,
            },
          ],
        },
        adminUser
      );

      const trip = await service.getTrip('kyoto-trip', null);
      expect(trip.id).toBe(created.id);
      expect(trip.title).toBe('京都秋日行');

      const route = await service.getTripRoute(created.id, null);
      expect(route.tripEntryId).toBe(created.id);
      expect(route.locations.length).toBe(2);
      expect(route.leafletPolyline.length).toBe(2);
    });

    it('should batch replace trip locations and re-calculate distance', async () => {
      const created = await service.createTrip(
        {
          title: '上海一日游',
          startDate: 1715000000000,
          endDate: 1715000000000,
        },
        adminUser
      );

      expect(created.distanceKm).toBe(0);

      const newLocations = [
        {
          name: '外滩',
          latitude: 31.2402,
          longitude: 121.4905,
          sortOrder: 0,
        },
        {
          name: '陆家嘴东方明珠',
          latitude: 31.2397,
          longitude: 121.4998,
          sortOrder: 1,
        },
      ];

      const updatedLocs = await service.setTripLocations(created.id, newLocations, adminUser);
      expect(updatedLocs.length).toBe(2);

      const refreshed = await service.getTrip(created.id, adminUser);
      expect(refreshed.locations.length).toBe(2);
      expect(refreshed.distanceKm).toBeGreaterThan(0);
    });

    it('should add a single location and update total distance', async () => {
      const created = await service.createTrip(
        {
          title: '巴黎步道',
          startDate: 1715000000000,
          endDate: 1715000000000,
          locations: [
            {
              name: '埃菲尔铁塔',
              latitude: 48.8584,
              longitude: 2.2945,
              sortOrder: 0,
            },
          ],
        },
        adminUser
      );

      expect(created.distanceKm).toBe(0);

      await service.addTripLocation(
        created.id,
        {
          name: '卢浮宫',
          latitude: 48.8606,
          longitude: 2.3376,
          sortOrder: 1,
        },
        adminUser
      );

      const refreshed = await service.getTrip(created.id, adminUser);
      expect(refreshed.locations.length).toBe(2);
      expect(refreshed.distanceKm).toBeGreaterThan(3);
    });

    it('should restrict private trip from public visitors', async () => {
      const created = await service.createTrip(
        {
          title: '机密行程',
          startDate: 1715000000000,
          endDate: 1715100000000,
          visibility: 'private',
        },
        adminUser
      );

      await expect(service.getTrip(created.id, null)).rejects.toThrow(UnauthorizedError);
      await expect(service.getTrip(created.id, guestUser)).rejects.toThrow(ForbiddenError);

      const adminView = await service.getTrip(created.id, adminUser);
      expect(adminView.id).toBe(created.id);
    });

    it('should soft delete trip and exclude from public feed', async () => {
      const created = await service.createTrip(
        {
          title: '已取消的旅行',
          startDate: 1715000000000,
          endDate: 1715100000000,
        },
        adminUser
      );

      await service.deleteTrip(created.id, adminUser, true);

      await expect(service.getTrip(created.id, null)).rejects.toThrow(UnauthorizedError);

      const adminView = await service.getTrip(created.id, adminUser);
      expect(adminView.deletedAt).toBeGreaterThan(0);
    });
  });
});
