import type { ArchiveModuleDefinition } from '@archive/contracts';
import type { ArchiveDb } from '@archive/database';
import { TravelService } from './application/travel.service.js';
import { mountTravelRoutes, type TravelRouteDependencies } from './presentation/routes.js';

export * from './domain/index.js';
export * from './infrastructure/schema.js';
export * from './application/index.js';
export * from './presentation/index.js';

/**
 * Factory to create an instance of TravelService
 */
export function createTravelService(db: ArchiveDb): TravelService {
  return new TravelService(db);
}

/**
 * Archive Travel & Leaflet Map Module Definition
 */
export const TravelModule: ArchiveModuleDefinition<any, TravelRouteDependencies> = {
  moduleId: 'travel',
  entryType: 'trip',
  name: 'Travel & Map Module',
  description: 'Travel footprint tracking, Haversine distance computation, and Leaflet GeoJSON route generation',
  version: '0.1.0',
  mountRoutes(app, deps) {
    mountTravelRoutes(app, deps);
  },
};
