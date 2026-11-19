import type { EntryDto, Visibility, EntryStatus } from '@archive/contracts';

export interface JournalDetailDto extends EntryDto {
  contentMarkdown: string;
  wordCount: number;
  mood: string | null;
  weather: string | null;
}

export interface CreateJournalInput {
  id?: string;
  slug?: string | null;
  title: string;
  summary?: string | null;
  contentMarkdown: string;
  occurredAt: number;
  mood?: string | null;
  weather?: string | null;
  visibility?: Visibility;
  status?: EntryStatus;
  coverMediaId?: string | null;
  tags?: string[];
}

export interface UpdateJournalInput {
  slug?: string | null;
  title?: string;
  summary?: string | null;
  contentMarkdown?: string;
  occurredAt?: number;
  mood?: string | null;
  weather?: string | null;
  visibility?: Visibility;
  status?: EntryStatus;
  coverMediaId?: string | null;
  tags?: string[];
}
