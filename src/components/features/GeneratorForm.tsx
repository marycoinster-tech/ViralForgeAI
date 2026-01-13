import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles } from 'lucide-react';
import { NICHES, VIBES, GOALS, PLATFORMS } from '@/constants/options';
import { GeneratorInput, Niche, Vibe, Goal, Platform } from '@/types/content';

interface GeneratorFormProps {
  onGenerate: (input: GeneratorInput) => void;
  isGenerating: boolean;
}

export function GeneratorForm({ onGenerate, isGenerating }: GeneratorFormProps) {
  const [selectedNiche, setSelectedNiche] = useState<Niche>('anime');
  const [selectedVibe, setSelectedVibe] = useState<Vibe>('dark');
  const [selectedGoal, setSelectedGoal] = useState<Goal>('followers');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('tiktok');
  const [customTopic, setCustomTopic] = useState('');

  const handleGenerate = () => {
    onGenerate({
      niche: selectedNiche,
      vibe: selectedVibe,
      goal: selectedGoal,
      platform: selectedPlatform,
      customTopic: customTopic.trim() || undefined,
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Hero Section */}
      <div className="text-center space-y-3 animate-fade-in">
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight">
          Go <span className="text-gradient">Viral</span> in Seconds
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          AI-powered hooks, scripts & captions that actually hit. Built for Gen Z creators who want results, not theory.
        </p>
      </div>

      {/* Form */}
      <div className="glass-card p-6 sm:p-8 space-y-6 animate-slide-up">
        {/* Niche Selection */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground/80">Pick Your Niche</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {NICHES.map((niche) => (
              <button
                key={niche.value}
                onClick={() => setSelectedNiche(niche.value)}
                className={`p-3 rounded-xl border-2 transition-all font-semibold text-sm ${
                  selectedNiche === niche.value
                    ? 'border-primary bg-primary/10 text-primary glow-primary'
                    : 'border-border bg-card/50 hover:border-primary/50'
                }`}
              >
                <span className="mr-1.5">{niche.emoji}</span>
                {niche.label}
              </button>
            ))}
          </div>
        </div>

        {/* Vibe Selection */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground/80">Choose Your Vibe</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {VIBES.map((vibe) => (
              <button
                key={vibe.value}
                onClick={() => setSelectedVibe(vibe.value)}
                className={`p-3 rounded-xl border-2 transition-all font-semibold text-sm relative overflow-hidden ${
                  selectedVibe === vibe.value
                    ? 'border-primary text-primary'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {selectedVibe === vibe.value && (
                  <div className={`absolute inset-0 bg-gradient-to-r ${vibe.color} opacity-10`} />
                )}
                <span className="relative z-10">{vibe.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Goal & Platform */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground/80">Your Goal</label>
            <div className="grid grid-cols-3 gap-2">
              {GOALS.map((goal) => (
                <button
                  key={goal.value}
                  onClick={() => setSelectedGoal(goal.value)}
                  className={`p-3 rounded-xl border-2 transition-all font-semibold text-xs ${
                    selectedGoal === goal.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card/50 hover:border-primary/50'
                  }`}
                >
                  <div className="text-lg mb-1">{goal.icon}</div>
                  {goal.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground/80">Platform</label>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORMS.map((platform) => (
                <button
                  key={platform.value}
                  onClick={() => setSelectedPlatform(platform.value)}
                  className={`p-3 rounded-xl border-2 transition-all font-semibold text-xs ${
                    selectedPlatform === platform.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card/50 hover:border-primary/50'
                  }`}
                >
                  {platform.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Custom Topic */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground/80">Custom Topic (Optional)</label>
          <Input
            placeholder="e.g., making money with AI, toxic dating advice..."
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            className="bg-background/50 border-border/50 focus:border-primary"
          />
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          size="lg"
          className="w-full h-14 text-lg font-bold glow-primary relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-[gradient_3s_ease_infinite]" />
          <span className="relative z-10 flex items-center gap-2">
            <Sparkles className={`h-5 w-5 ${isGenerating ? 'animate-spin' : 'animate-pulse'}`} />
            {isGenerating ? 'Generating Viral Content...' : 'Generate Viral Content'}
          </span>
        </Button>
      </div>
    </div>
  );
}
