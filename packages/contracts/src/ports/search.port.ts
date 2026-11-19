import type { PaginatedResult } from '../api/response.js';

/**
 * Lightweight search abstraction port for cross-module full-text and tag indexing.
 */

export interface SearchDocument {
  entryId: string;
  type: string;
  visibility: string;
  titleNormalized: string;
  tagsText: string;
  bodyExcerpt: string;
  updatedAt: number;
}

export interface SearchQuery {
  keyword: string;
  types?: string[];
  visibility?: string;
  limit?: number;
  cursor?: string;
}

export interface SearchResultItem {
  entryId: string;
  type: string;
  title: string;
  summary: string | null;
  matchedExcerpt?: string;
  occurredAt: number;
}

export interface SearchPort {
  /**
   * Add or update an entry document in the search index.
   */
  indexEntry(doc: SearchDocument): Promise<void>;

  /**
   * Remove an entry from the search index.
   */
  removeEntry(entryId: string): Promise<void>;

  /**
   * Search indexed documents matching keyword and query filters.
   */
  search(query: SearchQuery): Promise<PaginatedResult<SearchResultItem>>;
}
