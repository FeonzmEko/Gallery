import type { Visibility } from '../models/entry.js';
import type { MediaType } from '../models/media.js';

/**
 * Domain Event Base Interface
 */
export interface DomainEvent<TPayload = unknown> {
  readonly id: string;
  readonly type: string;
  readonly occurredAt: number;
  readonly payload: TPayload;
  readonly metadata?: Record<string, unknown>;
}

export type DomainEventHandler<TPayload = unknown> = (
  event: DomainEvent<TPayload>
) => Promise<void> | void;

/**
 * In-process Domain Event Bus Contract
 * Allows decoupled cross-module asynchronous notifications.
 */
export interface DomainEventBus {
  /**
   * Publish a single domain event.
   */
  publish<TPayload = unknown>(event: DomainEvent<TPayload>): Promise<void>;

  /**
   * Publish a batch of domain events in order.
   */
  publishAll(events: DomainEvent[]): Promise<void>;

  /**
   * Subscribe a listener function to a specific event type.
   * Returns an unsubscribe function.
   */
  subscribe<TPayload = unknown>(
    eventType: string,
    handler: DomainEventHandler<TPayload>
  ): () => void;
}

// ================= Standard Event Names =================

export const DomainEventType = {
  ENTRY_PUBLISHED: 'entry.published',
  ENTRY_UPDATED: 'entry.updated',
  ENTRY_DELETED: 'entry.deleted',
  MEDIA_UPLOADED: 'media.uploaded',
  MEDIA_DELETED: 'media.deleted',
} as const;

// ================= Standard Event Payloads =================

export interface EntryPublishedPayload {
  entryId: string;
  ownerId: string;
  type: string;
  title: string;
  occurredAt: number;
  visibility: Visibility;
}

export interface EntryUpdatedPayload {
  entryId: string;
  ownerId: string;
  type: string;
  title: string;
  changes: string[];
}

export interface EntryDeletedPayload {
  entryId: string;
  ownerId: string;
}

export interface MediaUploadedPayload {
  mediaId: string;
  ownerId: string;
  bucketKey: string;
  sizeBytes: number;
  mediaType: MediaType;
}

export interface MediaDeletedPayload {
  mediaId: string;
  bucketKey: string;
  thumbKey?: string | null;
}

/**
 * Domain event factory helper
 */
export function createDomainEvent<T>(
  type: string,
  payload: T,
  options: { id?: string; occurredAt?: number; metadata?: Record<string, unknown> } = {}
): DomainEvent<T> {
  return {
    id: options.id ?? `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type,
    occurredAt: options.occurredAt ?? Date.now(),
    payload,
    metadata: options.metadata,
  };
}
