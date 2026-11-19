import type { ArchiveModuleDefinition } from '@archive/contracts';
import type { ArchiveDb } from '@archive/database';
import { CommentService, type CommentServiceOptions } from './application/comment.service.js';
import { mountCommentRoutes, type CommentRouteDependencies } from './presentation/routes.js';

export * from './infrastructure/schema.js';
export * from './application/comment.service.js';
export * from './presentation/schema.js';
export * from './presentation/routes.js';

/**
 * Factory to create an instance of CommentService.
 */
export function createCommentService(
  db: ArchiveDb,
  options?: CommentServiceOptions
): CommentService {
  return new CommentService(db, options);
}

/**
 * Archive Comment Module Definition (Pluggable Module Interface).
 */
export const CommentModule: ArchiveModuleDefinition<any, CommentRouteDependencies> = {
  moduleId: 'comment',
  name: 'Comment Module',
  description: 'Pluggable comment system with anti-spam IP hashing, moderation, and cursor pagination',
  version: '0.1.0',
  mountRoutes(app, deps) {
    mountCommentRoutes(app, deps);
  },
};
