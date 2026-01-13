export type Niche = 'anime' | 'motivation' | 'money' | 'dating' | 'pov' | 'gym' | 'ai' | 'storytime';
export type Vibe = 'dark' | 'chill' | 'toxic' | 'motivational' | 'mysterious';
export type Goal = 'followers' | 'money' | 'engagement';
export type Platform = 'tiktok' | 'reels' | 'shorts';

export interface GeneratorInput {
  niche: Niche;
  vibe: Vibe;
  goal: Goal;
  platform: Platform;
  customTopic?: string;
}

export interface GeneratedContent {
  hook: string;
  script: string;
  caption: string;
  hashtags: string[];
  visualIdea: string;
  postingTip: string;
}
