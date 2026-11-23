import type { ArchiveModuleDefinition } from '@archive/contracts';

export * from './domain/crypto.js';
export * from './domain/rbac.js';
export * from './application/auth.service.js';
export * from './application/entry.service.js';
export * from './application/tag.service.js';
export * from './application/relation.service.js';
export * from './application/curator.service.js';
export * from './infrastructure/schema.js';

/**
 * Archive Core Module Definition
 */
export const CoreModule: ArchiveModuleDefinition = {
  moduleId: 'core',
  name: 'Core Archive Module',
  description: 'Users, Entries, Tags, Relations, Timeline and RBAC guards',
  version: '0.1.0',
};
