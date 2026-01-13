import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { NICHES, VIBES, GOALS, PLATFORMS } from '@/constants/options';
import { GeneratorInput, Niche, Vibe, Goal, Platform } from '@/types/content';
import { Sparkles, ChevronDown, Mic, Square } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface InputBarProps {
  onGenerate: (input: GeneratorInput) => void;
  disabled?: boolean;
}

export function InputBar({ onGenerate, disabled }: InputBarProps) {
  const [customTopic, setCustomTopic] = useState('');
  const [selectedNiche, setSelectedNiche] = useState<Niche>('anime');
  const [selectedVibe, setSelectedVibe] = useState<Vibe>('dark');
  const [selectedGoal, setSelectedGoal] = useState<Goal>('followers');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('tiktok');
  const [showOptions, setShowOptions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecognition | null>(null);

  const handleSubmit = () => {
    if (!customTopic.trim() && !showOptions) return;

    onGenerate({
      niche: selectedNiche,
      vibe: selectedVibe,
      goal: selectedGoal,
      platform: selectedPlatform,
      customTopic: customTopic.trim() || undefined,
    });

    setCustomTopic('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Voice recording using Web Speech API
  const startVoiceRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setCustomTopic((prev) => prev + finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    mediaRecorderRef.current = recognition;
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
  };

  const toggleVoiceRecording = () => {
    if (isRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  return (
    <div className="border-t border-border/40 bg-card/30 backdrop-blur">
      <div className="max-w-4xl mx-auto p-4 space-y-3">
        {/* Options Toggle */}
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${showOptions ? 'rotate-180' : ''}`} />
          {showOptions ? 'Hide options' : 'Show options'}
        </button>

        {/* Options Grid */}
        {showOptions && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 glass rounded-xl animate-fade-in">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Niche</label>
              <Select value={selectedNiche} onValueChange={(v) => setSelectedNiche(v as Niche)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NICHES.map((n) => (
                    <SelectItem key={n.value} value={n.value}>
                      {n.emoji} {n.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Vibe</label>
              <Select value={selectedVibe} onValueChange={(v) => setSelectedVibe(v as Vibe)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIBES.map((v) => (
                    <SelectItem key={v.value} value={v.value}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Goal</label>
              <Select value={selectedGoal} onValueChange={(v) => setSelectedGoal(v as Goal)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOALS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.icon} {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Platform</label>
              <Select value={selectedPlatform} onValueChange={(v) => setSelectedPlatform(v as Platform)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <Textarea
              placeholder="Drop a topic, vibe, or niche... (or just hit generate)"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled || isRecording}
              className="resize-none min-h-[56px] max-h-[200px] pr-12 rounded-2xl"
              rows={1}
            />
            {/* Voice Button Inside Textarea */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleVoiceRecording}
              disabled={disabled}
              className={`absolute right-2 bottom-2 h-8 w-8 ${
                isRecording ? 'text-destructive animate-pulse' : ''
              }`}
            >
              {isRecording ? (
                <Square className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={disabled || isRecording}
            size="lg"
            className="px-6 h-14 rounded-2xl shrink-0"
          >
            <Sparkles className="h-5 w-5" />
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          {isRecording ? (
            <span className="text-destructive font-semibold">🔴 Recording... Click mic to stop</span>
          ) : (
            'Press Enter to generate • Shift + Enter for new line • Click mic for voice input'
          )}
        </p>
      </div>
    </div>
  );
}
