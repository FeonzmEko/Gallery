import type { ArchiveModuleDefinition } from '@archive/contracts';

export * from './infrastructure/schema.js';
export * from './infrastructure/r2-storage.adapter.js';
export * from './application/media.service.js';

/**
 * Archive Media Module Definition
 */
export const MediaModule: ArchiveModuleDefinition = {
  moduleId: 'media',
  name: 'Media Module',
  description: 'Physical media asset registry, S3/R2 direct upload ticket generation, and attachments',
  version: '0.1.0',
};
