import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { entries } from '@archive/database';

/**
 * Trips Table
 * Stores travel metadata: travel dates, country, city highlights, and calculated itinerary distance.
 */
export const trips = sqliteTable('trips', {
  entryId: text('entry_id')
    .primaryKey()
    .references(() => entries.id, { onDelete: 'cascade' }),
  startDate: integer('start_date').notNull(),
  endDate: integer('end_date').notNull(),
  countryCode: text('country_code'),
  citySummary: text('city_summary'),
  distanceKm: real('distance_km').default(0),
});

/**
 * Trip Locations Table
 * Individual footprints / stops during a journey, with geographic coordinates for Leaflet maps.
 */
export const tripLocations = sqliteTable(
  'trip_locations',
  {
    id: text('id').primaryKey(),
    tripEntryId: text('trip_entry_id')
      .notNull()
      .references(() => trips.entryId, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    visitedAt: integer('visited_at'),
    sortOrder: integer('sort_order').notNull().default(0),
    notes: text('notes'),
  },
  (table) => [
    index('idx_trip_locations_trip_order').on(table.tripEntryId, table.sortOrder),
  ]
);

export type TripSelect = typeof trips.$inferSelect;
export type TripInsert = typeof trips.$inferInsert;

export type TripLocationSelect = typeof tripLocations.$inferSelect;
export type TripLocationInsert = typeof tripLocations.$inferInsert;
