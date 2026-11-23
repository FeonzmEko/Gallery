import { z } from 'zod';

/**
 * Curator Profile DTO (M4-1)
 * Represents the archive curator's profile, recent watching anime, and loop playlist.
 */
export interface CuratorRecentAnimeItem {
  title: string;
  status?: string;
  note?: string;
  progress?: string;
}

export interface CuratorPlaylistTrack {
  title: string;
  artist?: string;
  note?: string;
  url?: string;
}

export interface CuratorProfileDto {
  name: string;
  bio: string;
  statusText: string;
  location?: string | null;
  avatarUrl?: string | null;
  recentAnime: CuratorRecentAnimeItem[];
  loopPlaylist: CuratorPlaylistTrack[];
  currentlyReading?: string | null;
  updatedAt: number;
}

export type CuratorProfile = CuratorProfileDto;

export const CuratorRecentAnimeItemSchema = z.object({
  title: z.string().trim().min(1, '番剧名称不能为空').max(120),
  status: z.string().trim().max(40).optional(),
  note: z.string().trim().max(240).optional(),
  progress: z.string().trim().max(40).optional(),
});

export const CuratorPlaylistTrackSchema = z.object({
  title: z.string().trim().min(1, '曲目名称不能为空').max(120),
  artist: z.string().trim().max(100).optional(),
  note: z.string().trim().max(240).optional(),
  url: z.string().trim().max(500).optional(),
});

export const UpdateCuratorProfileInputSchema = z.object({
  name: z.string().trim().min(1, '馆主名称不能为空').max(100),
  bio: z.string().trim().max(2000).default(''),
  statusText: z.string().trim().max(300).default(''),
  location: z.string().trim().max(100).optional().nullable(),
  avatarUrl: z.string().trim().max(500).optional().nullable(),
  recentAnime: z.array(CuratorRecentAnimeItemSchema).max(20).default([]),
  loopPlaylist: z.array(CuratorPlaylistTrackSchema).max(30).default([]),
  currentlyReading: z.string().trim().max(200).optional().nullable(),
});

export type UpdateCuratorProfileInput = z.infer<typeof UpdateCuratorProfileInputSchema>;
