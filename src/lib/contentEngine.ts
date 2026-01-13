import { GeneratorInput, GeneratedContent } from '@/types/content';

// Viral hook templates by niche and vibe
const HOOK_TEMPLATES = {
  anime: {
    dark: [
      "POV: You just realized {topic}...",
      "This anime scene hit different when you understand {topic}",
      "Nobody talks about how {topic}",
      "When {topic} but you're literally {emotion}:",
    ],
    chill: [
      "Just watched this and {emotion}",
      "This anime moment when {topic}",
      "The way {topic} in anime >>",
    ],
    toxic: [
      "If you don't get {topic}, we're not the same",
      "POV: You just understood {topic} (you're different now)",
      "When they don't know {topic}:",
    ],
    motivational: [
      "This anime scene changed how I see {topic}",
      "Watch this if you need {emotion} about {topic}",
      "POV: {topic} hits different at 3am",
    ],
    mysterious: [
      "Wait until you realize {topic}...",
      "If you know, you know: {topic}",
      "The moment you understand {topic}:",
    ],
  },
  motivation: {
    dark: [
      "Nobody's coming to save you. {topic}",
      "You already lost if you think {topic}",
      "POV: You finally realized {topic}",
    ],
    motivational: [
      "This is your sign to {topic}",
      "You need to hear this: {topic}",
      "POV: You finally understand {topic}",
    ],
    toxic: [
      "If you're still {topic}, you're cooked",
      "Bros who don't {topic} are NOT making it",
      "Stop {topic} and start {emotion}",
    ],
  },
  money: {
    dark: [
      "You're broke because {topic}",
      "Nobody tells you {topic}",
      "POV: You just learned {topic} (it's over)",
    ],
    motivational: [
      "How I made ${topic} by doing {emotion}",
      "This is how you actually {topic}",
      "Stop being broke: {topic}",
    ],
    toxic: [
      "Broke people don't know {topic}",
      "If you're not {topic}, you're ngmi",
      "POV: You're still {topic} in 2026",
    ],
  },
};

const SCRIPT_TEMPLATES = {
  structure: [
    "{hook} / {context} / {payoff} / {loop}",
    "{pattern_interrupt} / {emotional_reveal} / {value_drop} / {cta}",
  ],
};

const CAPTIONS = {
  anime: [
    "this hit different ngl 😭",
    "if you know you know 🔥",
    "nobody talks about this fr",
    "the way this makes sense now >>",
  ],
  motivation: [
    "you needed this 💯",
    "real ones know 🔥",
    "no cap this changed me",
    "time to lock in fr fr",
  ],
  money: [
    "broke mindset vs rich mindset",
    "they don't want you to know this 💰",
    "this is how you actually win",
    "ngmi if you skip this",
  ],
  dating: [
    "this is why you're single 💀",
    "green flags only >>",
    "toxic but relatable 😭",
    "if they don't do this, run",
  ],
  pov: [
    "this is too real 😭",
    "if you get it you get it",
    "nobody's talking about this",
    "the accuracy is scary",
  ],
  gym: [
    "no excuses 💪",
    "lock in szn",
    "we're all gonna make it",
    "lightweight baby",
  ],
  ai: [
    "the future is insane 🤖",
    "ai is getting scary good",
    "this changes everything fr",
    "we're living in the future",
  ],
  storytime: [
    "wait for the plot twist 😭",
    "this actually happened",
    "you won't believe what happened next",
    "storytime bc why not",
  ],
};

const HASHTAG_GROUPS = {
  viral: ['fyp', 'viral', 'foryou', 'foryoupage', 'trending'],
  niche_specific: {
    anime: ['anime', 'animeedit', 'animeedits', 'weeb', 'otaku'],
    motivation: ['motivation', 'motivational', 'mindset', 'selfimprovement', 'grindset'],
    money: ['money', 'finance', 'entrepreneur', 'hustle', 'sidehustle'],
    dating: ['dating', 'relationship', 'love', 'relationshipadvice', 'datingadvice'],
    pov: ['pov', 'relatable', 'relatablecontent', 'povs'],
    gym: ['gym', 'fitness', 'workout', 'gymmotivation', 'fitnessmotivation'],
    ai: ['ai', 'artificialintelligence', 'tech', 'technology', 'aitools'],
    storytime: ['storytime', 'story', 'storytelling', 'storytimes'],
  },
  engagement: ['xyzbca', 'explore', 'viralvideo'],
};

function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateHook(input: GeneratorInput): string {
  const templates = HOOK_TEMPLATES[input.niche]?.[input.vibe] || HOOK_TEMPLATES.anime.dark;
  const template = getRandomItem(templates);
  
  const topic = input.customTopic || input.niche;
  const emotion = ['completely shook', 'lowkey broken', 'not okay', 'different now'][Math.floor(Math.random() * 4)];
  
  return template.replace('{topic}', topic).replace('{emotion}', emotion);
}

function generateScript(input: GeneratorInput, hook: string): string {
  const contexts = [
    `So basically, everyone's doing ${input.niche} wrong.`,
    `Here's what nobody tells you about ${input.niche}.`,
    `I learned this the hard way, but ${input.niche} is actually`,
    `The thing about ${input.niche} that changed everything for me:`,
  ];
  
  const payoffs = [
    `Once you understand this, you literally can't unsee it.`,
    `And that's when everything clicked for me.`,
    `This is the part that hits different.`,
    `And now you know what they don't want you to know.`,
  ];
  
  const loops = [
    `Follow for more like this.`,
    `Part 2?`,
    `Comment if you want the full breakdown.`,
    `Smash follow if this helped.`,
  ];
  
  return `${hook}\n\n${getRandomItem(contexts)}\n\n${getRandomItem(payoffs)}\n\n${getRandomItem(loops)}`;
}

function generateCaption(input: GeneratorInput): string {
  const nicheCaption = getRandomItem(CAPTIONS[input.niche] || CAPTIONS.pov);
  const extraContext = input.customTopic ? ` (${input.customTopic})` : '';
  return nicheCaption + extraContext;
}

function generateHashtags(input: GeneratorInput): string[] {
  const viral = HASHTAG_GROUPS.viral.slice(0, 3);
  const niche = HASHTAG_GROUPS.niche_specific[input.niche]?.slice(0, 2) || [];
  const engagement = HASHTAG_GROUPS.engagement.slice(0, 2);
  
  return [...viral, ...niche, ...engagement];
}

function generateVisualIdea(input: GeneratorInput): string {
  const visuals = {
    anime: [
      'Anime clips from Attack on Titan or Demon Slayer with text overlay',
      'Sad anime aesthetic with rain effects',
      'Anime character staring intensely at camera',
      'Manga panels with dramatic zoom',
    ],
    motivation: [
      'Black screen with white text transitions',
      'Gym footage with motivational text overlay',
      'Sigma male face zoom with dark background',
      'Fast cuts of success imagery',
    ],
    money: [
      'Cash counting + luxury lifestyle B-roll',
      'Laptop screen showing numbers going up',
      'Split screen: broke vs rich lifestyle',
      'Stock market charts + money visuals',
    ],
    dating: [
      'POV angle with text messages',
      'Green screen with dating scenario acting',
      'Couple aesthetic clips with text',
      'Mirror selfie with caption overlay',
    ],
    pov: [
      'POV camera angle looking at subject',
      'First-person perspective scenario',
      'Reaction face with scenario text',
      'Over-the-shoulder shot',
    ],
    gym: [
      'Gym workout footage with motivational text',
      'Before/after transformation split',
      'Heavy lifts with hype music',
      'Gym aesthetic with workout clips',
    ],
    ai: [
      'Screen recording of AI tool in action',
      'Futuristic tech visuals',
      'Split screen: before AI vs after AI',
      'AI-generated imagery showcase',
    ],
    storytime: [
      'Subway surfers or GTA gameplay background',
      'Face talking to camera with captions',
      'Minecraft parkour with story text',
      'ASMR cooking video with story overlay',
    ],
  };
  
  return getRandomItem(visuals[input.niche] || visuals.pov);
}

function generatePostingTip(input: GeneratorInput): string {
  const tips = [
    'Post at 7-9 PM for max engagement',
    'Use trending sounds for algorithm boost',
    'Reply to comments within first hour',
    'Pin your best comment to drive engagement',
    'Add captions for watch time retention',
    'Hook must hit within 0.5 seconds',
    'Repost if it flops first time (different time)',
    'Cross-post to all platforms same day',
  ];
  
  return getRandomItem(tips);
}

export function generateViralContent(input: GeneratorInput): GeneratedContent {
  const hook = generateHook(input);
  const script = generateScript(input, hook);
  const caption = generateCaption(input);
  const hashtags = generateHashtags(input);
  const visualIdea = generateVisualIdea(input);
  const postingTip = generatePostingTip(input);
  
  return {
    hook,
    script,
    caption,
    hashtags,
    visualIdea,
    postingTip,
  };
}
