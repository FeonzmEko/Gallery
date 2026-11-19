import { z } from 'zod';

export const StandardMoods = [
  'happy',
  'excited',
  'grateful',
  'relaxed',
  'peaceful',
  'neutral',
  'thoughtful',
  'tired',
  'sad',
  'anxious',
  'frustrated',
] as const;

export type StandardMood = (typeof StandardMoods)[number];

export const MoodSchema = z.string().trim().min(1).max(50);
export type Mood = z.infer<typeof MoodSchema>;
