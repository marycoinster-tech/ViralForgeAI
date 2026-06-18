import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { NICHES, VIBES, GOALS, PLATFORMS } from '@/constants/options';
import { GeneratorInput, Niche, Vibe, Goal, Platform } from '@/types/content';
import { Sparkles, ChevronDown, Mic, Square, Pause, Play, Image } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
  defaultNiche?: string;
  dailyImageCount?: number;
  dailyImageLimit?: number;
}

export function InputBar({ onGenerate, disabled, defaultNiche, dailyImageCount = 0, dailyImageLimit = 4 }: InputBarProps) {
  const { toast } = useToast();
  const [customTopic, setCustomTopic] = useState('');
  const [selectedNiche, setSelectedNiche] = useState<Niche>((defaultNiche as Niche) || 'anime');
  const [selectedVibe, setSelectedVibe] = useState<Vibe>('dark');
  const [selectedGoal, setSelectedGoal] = useState<Goal>('followers');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('tiktok');
  const [showOptions, setShowOptions] = useState(false);
  const [thumbnailMode, setThumbnailMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [frequencyBars, setFrequencyBars] = useState<number[]>(new Array(20).fill(0));
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const mediaRecorderRef = useRef<any | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any | null>(null);

  const imagesLeft = dailyImageLimit - dailyImageCount;

  const handleSubmit = () => {
    if (!customTopic.trim() && !showOptions) return;

    if (thumbnailMode) {
      if (imagesLeft <= 0) {
        toast({ title: 'Daily thumbnail limit reached', description: `You can generate ${dailyImageLimit} thumbnails per day.`, variant: 'destructive' });
        return;
      }
      // Prepend /thumbnail marker so Chat.tsx can detect it
      onGenerate({
        niche: selectedNiche,
        vibe: selectedVibe,
        goal: selectedGoal,
        platform: selectedPlatform,
        customTopic: `[THUMBNAIL REQUEST] ${customTopic.trim()}`,
      });
      setCustomTopic('');
    } else {
      onGenerate({
        niche: selectedNiche,
        vibe: selectedVibe,
        goal: selectedGoal,
        platform: selectedPlatform,
        customTopic: customTopic.trim() || undefined,
      });
      setCustomTopic('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSpeechSupported(!!SpeechRecognition);
  }, []);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const startAudioVisualization = async (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!analyserRef.current || isPaused) {
          if (isPaused) { setAudioLevel(0); setFrequencyBars(new Array(20).fill(0)); }
          if (!isPaused) animationFrameRef.current = requestAnimationFrame(updateLevel);
          return;
        }
        analyserRef.current.getByteFrequencyData(dataArray);
        const overallLevel = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalizedLevel = overallLevel / 255;
        const bars: number[] = [];
        for (let i = 0; i < 20; i++) {
          bars.push(Math.min(1, normalizedLevel * (0.9 + Math.random() * 0.2)));
        }
        setAudioLevel(normalizedLevel);
        setFrequencyBars(bars);
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (error) {
      console.error('Audio visualization error:', error);
    }
  };

  const startVoiceRecording = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: 'Voice input not supported', description: 'Your browser doesn\'t support voice input. Please type instead or use Chrome on Android.', variant: 'destructive' });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      await startAudioVisualization(stream);
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      recognition.onstart = () => { setIsRecording(true); setIsPaused(false); };
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + ' ';
        }
        if (finalTranscript) setCustomTopic((prev) => prev + finalTranscript);
      };
      recognition.onerror = () => stopVoiceRecording();
      recognition.onend = () => { if (!isPaused) stopVoiceRecording(); };
      recognition.start();
      mediaRecorderRef.current = recognition;
    } catch (error: any) {
      let errorMessage = 'Could not access microphone.';
      if (error.name === 'NotAllowedError') errorMessage = 'Microphone permission denied.';
      else if (error.name === 'NotFoundError') errorMessage = 'No microphone found.';
      toast({ title: 'Voice input failed', description: errorMessage, variant: 'destructive' });
      if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null; }
    }
  };

  const pauseVoiceRecording = () => {
    if (recognitionRef.current && !isPaused) {
      try { recognitionRef.current.stop(); } catch (e) { /**/ }
      setIsPaused(true);
      setAudioLevel(0);
      setFrequencyBars(new Array(20).fill(0));
    }
  };

  const resumeVoiceRecording = () => {
    if (!isPaused || !isRecording) return;
    setIsPaused(false);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + ' ';
      }
      if (finalTranscript) setCustomTopic((prev) => prev + finalTranscript);
    };
    recognition.onerror = () => stopVoiceRecording();
    recognition.start();
    mediaRecorderRef.current = recognition;
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch { /**/ } recognitionRef.current = null; }
    if (mediaRecorderRef.current) mediaRecorderRef.current = null;
    if (animationFrameRef.current) { cancelAnimationFrame(animationFrameRef.current); animationFrameRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null; }
    setIsRecording(false);
    setIsPaused(false);
    setAudioLevel(0);
    setFrequencyBars(new Array(20).fill(0));
  };

  const toggleVoiceRecording = () => {
    if (isRecording) stopVoiceRecording();
    else startVoiceRecording();
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
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NICHES.map((n) => <SelectItem key={n.value} value={n.value}>{n.emoji} {n.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Vibe</label>
              <Select value={selectedVibe} onValueChange={(v) => setSelectedVibe(v as Vibe)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VIBES.map((v) => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Goal</label>
              <Select value={selectedGoal} onValueChange={(v) => setSelectedGoal(v as Goal)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GOALS.map((g) => <SelectItem key={g.value} value={g.value}>{g.icon} {g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Platform</label>
              <Select value={selectedPlatform} onValueChange={(v) => setSelectedPlatform(v as Platform)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Thumbnail Mode info */}
        {thumbnailMode && (
          <div className="flex items-center gap-2 p-2.5 glass rounded-xl animate-fade-in">
            <Image className="h-4 w-4 text-violet-400 shrink-0" />
            <p className="text-xs text-muted-foreground flex-1">
              Describe your thumbnail — e.g. <span className="text-violet-400 font-semibold">"gym motivation dark background athlete"</span>
            </p>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${imagesLeft > 0 ? 'text-violet-400 bg-violet-400/10' : 'text-red-400 bg-red-400/10'}`}>
              {imagesLeft}/{dailyImageLimit} left today
            </span>
          </div>
        )}

        {/* Input Area */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <Textarea
              placeholder={thumbnailMode
                ? 'Describe your thumbnail concept...'
                : 'Drop a topic, vibe, or niche... (or just hit generate)'}
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled || isRecording}
              className="resize-none min-h-[56px] max-h-[200px] pr-12 rounded-2xl"
              rows={1}
            />
            {/* Voice Button */}
            {isSpeechSupported && !thumbnailMode && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleVoiceRecording}
                disabled={disabled}
                className={`absolute right-2 bottom-2 h-8 w-8 ${isRecording ? 'text-destructive animate-pulse' : ''}`}
              >
                {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )}
          </div>

          {/* Thumbnail Toggle */}
          <Button
            type="button"
            variant={thumbnailMode ? 'default' : 'outline'}
            size="lg"
            onClick={() => setThumbnailMode(!thumbnailMode)}
            disabled={disabled || isRecording}
            className={`px-4 h-14 rounded-2xl shrink-0 ${thumbnailMode ? 'bg-violet-600 hover:bg-violet-700 border-0' : 'border-violet-500/30 text-violet-400 hover:bg-violet-500/10'}`}
            title="Generate AI thumbnail for your video"
          >
            <Image className="h-5 w-5" />
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={disabled || isRecording || (thumbnailMode && !customTopic.trim())}
            size="lg"
            className="px-6 h-14 rounded-2xl shrink-0"
          >
            <Sparkles className="h-5 w-5" />
          </Button>
        </div>

        {/* Recording Indicator */}
        {isRecording && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-center gap-3 py-2">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-destructive animate-pulse'}`} />
                <span className={`text-xs font-semibold ${isPaused ? 'text-yellow-500' : 'text-destructive'}`}>
                  {isPaused ? 'Paused' : 'Recording'}
                </span>
              </div>
              <div className="flex items-center gap-0.5 h-10">
                {frequencyBars.map((level, i) => {
                  const baseHeight = 4;
                  const maxHeight = 40;
                  const height = isPaused ? baseHeight : Math.max(baseHeight, Math.min(maxHeight, level * maxHeight * 2));
                  return (
                    <div
                      key={i}
                      className="w-1 bg-gradient-to-t from-primary via-accent to-primary rounded-full transition-all duration-100 ease-out"
                      style={{ height: `${height}px`, opacity: isPaused ? 0.3 : 1 }}
                    />
                  );
                })}
              </div>
              <span className="text-xs text-muted-foreground">{isPaused ? 'Tap resume' : 'Speaking...'}</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={isPaused ? resumeVoiceRecording : pauseVoiceRecording}
                className={`h-9 w-9 ${isPaused ? 'border-primary/40 hover:bg-primary/10' : 'border-yellow-500/40 hover:bg-yellow-500/10'}`}
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={stopVoiceRecording} className="h-9 px-4 border-destructive/40 hover:bg-destructive/10">
                Stop
              </Button>
            </div>
          </div>
        )}

        {!isRecording && (
          <p className="text-xs text-center text-muted-foreground">
            {thumbnailMode
              ? `🖼️ AI Thumbnail Generator • ${imagesLeft}/${dailyImageLimit} images remaining today`
              : `Press Enter to generate • Shift + Enter for new line${isSpeechSupported ? ' • Click mic for voice' : ''}`
            }
          </p>
        )}
      </div>
    </div>
  );
}
