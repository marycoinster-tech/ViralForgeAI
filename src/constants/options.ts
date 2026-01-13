import { Niche, Vibe, Goal, Platform } from '@/types/content';

export const NICHES: { value: Niche; label: string; emoji: string }[] = [
  { value: 'anime', label: 'Anime', emoji: '⚡' },
  { value: 'motivation', label: 'Motivation', emoji: '🔥' },
  { value: 'money', label: 'Money', emoji: '💰' },
  { value: 'dating', label: 'Dating', emoji: '💕' },
  { value: 'pov', label: 'POV', emoji: '🎭' },
  { value: 'gym', label: 'Gym', emoji: '💪' },
  { value: 'ai', label: 'AI', emoji: '🤖' },
  { value: 'storytime', label: 'Storytime', emoji: '📖' },
];

export const VIBES: { value: Vibe; label: string; color: string }[] = [
  { value: 'dark', label: 'Dark', color: 'from-purple-600 to-black' },
  { value: 'chill', label: 'Chill', color: 'from-blue-500 to-cyan-400' },
  { value: 'toxic', label: 'Toxic', color: 'from-red-600 to-pink-500' },
  { value: 'motivational', label: 'Motivational', color: 'from-orange-500 to-yellow-400' },
  { value: 'mysterious', label: 'Mysterious', color: 'from-indigo-600 to-purple-700' },
];

export const GOALS: { value: Goal; label: string; icon: string }[] = [
  { value: 'followers', label: 'Followers', icon: '👥' },
  { value: 'money', label: 'Money', icon: '💸' },
  { value: 'engagement', label: 'Engagement', icon: '❤️' },
];

export const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'reels', label: 'Reels' },
  { value: 'shorts', label: 'Shorts' },
];
