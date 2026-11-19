import type { ArchiveModuleDefinition } from '@archive/contracts';
import type { ArchiveDb } from '@archive/database';
import { JournalService } from './application/journal.service.js';
import { mountJournalRoutes, type JournalRouteDependencies } from './presentation/routes.js';

export * from './domain/index.js';
export * from './infrastructure/schema.js';
export * from './application/index.js';
export * from './presentation/index.js';

/**
 * Factory to create an instance of JournalService
 */
export function createJournalService(db: ArchiveDb): JournalService {
  return new JournalService(db);
}

/**
 * Archive Journal Module Definition
 */
export const JournalModule: ArchiveModuleDefinition<any, JournalRouteDependencies> = {
  moduleId: 'journal',
  entryType: 'journal',
  name: 'Journal Module',
  description: 'Daily thoughts, mood, weather, and markdown journal entries with automatic word counting',
  version: '0.1.0',
  mountRoutes(app, deps) {
    mountJournalRoutes(app, deps);
  },
};
