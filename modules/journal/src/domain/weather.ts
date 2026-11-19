import { z } from 'zod';

export const StandardWeathers = [
  'sunny',
  'clear',
  'cloudy',
  'overcast',
  'rainy',
  'thunderstorm',
  'snowy',
  'windy',
  'foggy',
  'hazy',
] as const;

export type StandardWeather = (typeof StandardWeathers)[number];

export const WeatherSchema = z.string().trim().min(1).max(50);
export type Weather = z.infer<typeof WeatherSchema>;
