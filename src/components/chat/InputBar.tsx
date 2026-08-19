import { useState, useRef, useEffect } from 'react';
import { NICHES, VIBES, GOALS, PLATFORMS } from '@/constants/options';
import { GeneratorInput, Niche, Vibe, Goal, Platform } from '@/types/content';
import { useToast } from '@/hooks/use-toast';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sparkles, Mic, Square, Pause, Play, Image, Skull,
  SlidersHorizontal, ChevronUp, ChevronDown, Send,
} from 'lucide-react';

interface InputBarProps {
  onGenerate: (input: GeneratorInput) => void;
  disabled?: boolean;
  defaultNiche?: string;
  dailyImageCount?: number;
  dailyImageLimit?: number;
}

export function InputBar({
  onGenerate, disabled, defaultNiche,
  dailyImageCount = 0, dailyImageLimit = 4,
}: InputBarProps) {
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [customTopic, setCustomTopic] = useState('');
  const [selectedNiche, setSelectedNiche] = useState<Niche>((defaultNiche as Niche) || 'anime');
  const [selectedVibe, setSelectedVibe] = useState<Vibe>('dark');
  const [selectedGoal, setSelectedGoal] = useState<Goal>('followers');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('tiktok');
  const [showOptions, setShowOptions] = useState(false);
  const [thumbnailMode, setThumbnailMode] = useState(false);
  const [roastMode, setRoastMode] = useState(false);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [frequencyBars, setFrequencyBars] = useState<number[]>(new Array(16).fill(0));
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const mediaRecorderRef = useRef<any | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any | null>(null);

  const imagesLeft = dailyImageLimit - dailyImageCount;

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [customTopic]);

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

  // When roastMode turns on, clear thumbnailMode and vice versa
  const toggleRoastMode = () => {
    setRoastMode(v => !v);
    setThumbnailMode(false);
  };

  const toggleThumbnailMode = () => {
    setThumbnailMode(v => !v);
    setRoastMode(false);
  };

  const getPlaceholder = () => {
    if (roastMode) return 'Paste your script here and I\'ll roast it 💀 Be brutal? Yes.';
    if (thumbnailMode) return 'Describe your thumbnail concept — e.g. "dark neon athlete with fire background"';
    return 'Drop a topic, niche, vibe — or just tell me what\'s on your mind...';
  };

  const handleSubmit = () => {
    const text = customTopic.trim();

    if (roastMode) {
      if (!text) {
        toast({ title: 'Paste your script first 💀', description: 'I need something to roast.', variant: 'destructive' });
        return;
      }
      onGenerate({
        niche: selectedNiche,
        vibe: selectedVibe,
        goal: selectedGoal,
        platform: selectedPlatform,
        customTopic: `Roast my script — be brutal, no mercy, highlight every weak line and tell me exactly why it sucks. Then offer to fix it:\n\n"${text}"`,
      });
      setCustomTopic('');
      setRoastMode(false);
      return;
    }

    if (thumbnailMode) {
      if (!text) {
        toast({ title: 'Describe your thumbnail 🖼️', description: 'Tell me the vibe and I\'ll generate it.', variant: 'destructive' });
        return;
      }
      if (imagesLeft <= 0) {
        toast({ title: 'Daily limit reached', description: `${dailyImageLimit} thumbnails/day. Come back tomorrow!`, variant: 'destructive' });
        return;
      }
      onGenerate({
        niche: selectedNiche, vibe: selectedVibe, goal: selectedGoal, platform: selectedPlatform,
        customTopic: `[THUMBNAIL REQUEST] ${text}`,
      });
      setCustomTopic('');
      return;
    }

    // Normal generate — allow empty (shows options grid generation)
    onGenerate({
      niche: selectedNiche, vibe: selectedVibe, goal: selectedGoal, platform: selectedPlatform,
      customTopic: text || undefined,
    });
    setCustomTopic('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // ── Voice recording ──────────────────────────────────────────────────────
  const startAudioVisualization = async (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const update = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const level = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255;
        const bars = Array.from({ length: 16 }, () => Math.min(1, level * (0.8 + Math.random() * 0.4)));
        setFrequencyBars(bars);
        animationFrameRef.current = requestAnimationFrame(update);
      };
      update();
    } catch { /* noop */ }
  };

  const startVoiceRecording = async () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast({ title: 'Voice not supported', description: 'Use Chrome on Android for voice input.', variant: 'destructive' });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      await startAudioVisualization(stream);
      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.onstart = () => { setIsRecording(true); setIsPaused(false); };
      rec.onresult = (e: any) => {
        let final = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
        }
        if (final) setCustomTopic(p => p + final);
      };
      rec.onerror = () => stopVoiceRecording();
      rec.onend = () => { if (!isPaused) stopVoiceRecording(); };
      rec.start();
      recognitionRef.current = rec;
      mediaRecorderRef.current = rec;
    } catch (err: any) {
      let msg = 'Could not access microphone.';
      if (err.name === 'NotAllowedError') msg = 'Microphone permission denied.';
      toast({ title: 'Voice failed', description: msg, variant: 'destructive' });
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    }
  };

  const pauseVoiceRecording = () => {
    if (!isPaused) {
      try { recognitionRef.current?.stop(); } catch { /**/ }
      setIsPaused(true);
      setFrequencyBars(new Array(16).fill(0));
    }
  };

  const resumeVoiceRecording = () => {
    if (!isPaused) return;
    setIsPaused(false);
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (e: any) => {
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
      }
      if (final) setCustomTopic(p => p + final);
    };
    rec.onerror = () => stopVoiceRecording();
    rec.start();
    recognitionRef.current = rec;
  };

  const stopVoiceRecording = () => {
    try { recognitionRef.current?.stop(); } catch { /**/ }
    recognitionRef.current = null;
    mediaRecorderRef.current = null;
    if (animationFrameRef.current) { cancelAnimationFrame(animationFrameRef.current); animationFrameRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    analyserRef.current = null;
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    mediaStreamRef.current = null;
    setIsRecording(false);
    setIsPaused(false);
    setFrequencyBars(new Array(16).fill(0));
  };

  const toggleVoice = () => {
    if (isRecording) stopVoiceRecording();
    else startVoiceRecording();
  };

  // ── Mode badge ───────────────────────────────────────────────────────────
  const modeBadge = roastMode
    ? <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">💀 ROAST MODE</span>
    : thumbnailMode
    ? <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">🖼️ THUMBNAIL — {imagesLeft}/{dailyImageLimit} left</span>
    : null;

  return (
    <div className="border-t border-border/40 bg-background/80 backdrop-blur-xl safe-area-bottom">
      <div className="max-w-4xl mx-auto p-3 sm:p-4 space-y-2">

        {/* Options panel (collapsible) */}
        {showOptions && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-2xl bg-muted/30 border border-border/40 animate-fade-in">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Niche</label>
              <Select value={selectedNiche} onValueChange={(v) => setSelectedNiche(v as Niche)}>
                <SelectTrigger className="h-9 text-xs rounded-xl bg-background/70"><SelectValue /></SelectTrigger>
                <SelectContent>{NICHES.map(n => <SelectItem key={n.value} value={n.value}>{n.emoji} {n.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Vibe</label>
              <Select value={selectedVibe} onValueChange={(v) => setSelectedVibe(v as Vibe)}>
                <SelectTrigger className="h-9 text-xs rounded-xl bg-background/70"><SelectValue /></SelectTrigger>
                <SelectContent>{VIBES.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Goal</label>
              <Select value={selectedGoal} onValueChange={(v) => setSelectedGoal(v as Goal)}>
                <SelectTrigger className="h-9 text-xs rounded-xl bg-background/70"><SelectValue /></SelectTrigger>
                <SelectContent>{GOALS.map(g => <SelectItem key={g.value} value={g.value}>{g.icon} {g.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Platform</label>
              <Select value={selectedPlatform} onValueChange={(v) => setSelectedPlatform(v as Platform)}>
                <SelectTrigger className="h-9 text-xs rounded-xl bg-background/70"><SelectValue /></SelectTrigger>
                <SelectContent>{PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Voice recording waveform */}
        {isRecording && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-muted/30 border border-border/40 animate-fade-in">
            <div className={`w-2 h-2 rounded-full shrink-0 ${isPaused ? 'bg-amber-400' : 'bg-red-500 animate-pulse'}`} />
            <div className="flex items-end gap-0.5 h-6 flex-1">
              {frequencyBars.map((lvl, i) => (
                <div key={i} className="w-1 bg-primary rounded-full transition-all duration-75"
                  style={{ height: `${isPaused ? 4 : Math.max(4, lvl * 24)}px` }} />
              ))}
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{isPaused ? 'Paused' : 'Listening…'}</span>
            <button onClick={isPaused ? resumeVoiceRecording : pauseVoiceRecording}
              className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
              {isPaused ? <Play className="h-3.5 w-3.5 text-primary" /> : <Pause className="h-3.5 w-3.5 text-amber-400" />}
            </button>
            <button onClick={stopVoiceRecording}
              className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
              <Square className="h-3.5 w-3.5 text-red-400" />
            </button>
          </div>
        )}

        {/* ── Main input card ── */}
        <div className={`relative rounded-2xl border bg-card/60 backdrop-blur transition-all duration-200 ${
          roastMode ? 'border-red-500/40 shadow-red-500/5 shadow-md' :
          thumbnailMode ? 'border-violet-500/40 shadow-violet-500/5 shadow-md' :
          'border-border/60 focus-within:border-primary/50 focus-within:shadow-primary/5 focus-within:shadow-md'
        }`}>

          {/* Mode badge inside card top */}
          {modeBadge && (
            <div className="px-3 pt-2.5">{modeBadge}</div>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={customTopic}
            onChange={e => setCustomTopic(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isRecording}
            placeholder={getPlaceholder()}
            rows={1}
            className="w-full resize-none bg-transparent px-4 py-3 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/50 min-h-[52px] max-h-[160px] disabled:opacity-50"
            style={{ fieldSizing: 'content' } as any}
          />

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between px-2 pb-2 gap-2">
            {/* Left group: Roast | Thumbnail | Options */}
            <div className="flex items-center gap-1">
              {/* Options toggle */}
              <button
                type="button"
                onClick={() => setShowOptions(v => !v)}
                className={`flex items-center gap-1 h-8 px-2.5 rounded-xl text-xs font-semibold transition-all ${
                  showOptions
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
                title="Niche / Vibe / Goal / Platform"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Options</span>
                {showOptions
                  ? <ChevronDown className="h-3 w-3" />
                  : <ChevronUp className="h-3 w-3" />}
              </button>

              {/* Roast mode */}
              <button
                type="button"
                onClick={toggleRoastMode}
                title="Roast My Script 💀"
                className={`h-8 w-8 flex items-center justify-center rounded-xl text-base transition-all ${
                  roastMode
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40 scale-110'
                    : 'text-muted-foreground hover:text-red-400 hover:bg-red-500/10'
                }`}
              >
                <Skull className="h-3.5 w-3.5" />
              </button>

              {/* Thumbnail / Image mode */}
              <button
                type="button"
                onClick={toggleThumbnailMode}
                title={thumbnailMode ? `Thumbnail mode — ${imagesLeft}/${dailyImageLimit} left` : 'Generate AI Thumbnail'}
                className={`h-8 w-8 flex items-center justify-center rounded-xl transition-all ${
                  thumbnailMode
                    ? 'bg-violet-500/20 text-violet-400 border border-violet-500/40 scale-110'
                    : 'text-muted-foreground hover:text-violet-400 hover:bg-violet-500/10'
                }`}
              >
                <Image className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Right group: Voice | Send */}
            <div className="flex items-center gap-1.5">
              {/* Voice button */}
              {isSpeechSupported && !thumbnailMode && (
                <button
                  type="button"
                  onClick={toggleVoice}
                  disabled={disabled}
                  title={isRecording ? 'Stop recording' : 'Voice input'}
                  className={`h-8 w-8 flex items-center justify-center rounded-xl transition-all ${
                    isRecording
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <Mic className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Send / Generate button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={disabled || isRecording || (thumbnailMode && !customTopic.trim())}
                className={`h-9 px-4 rounded-xl text-sm font-black flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  roastMode
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/20'
                    : thumbnailMode
                    ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/20'
                    : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 glow-primary'
                }`}
              >
                {roastMode
                  ? <><Skull className="h-3.5 w-3.5" /><span className="hidden sm:inline">Roast</span></>
                  : thumbnailMode
                  ? <><Image className="h-3.5 w-3.5" /><span className="hidden sm:inline">Generate</span></>
                  : <><Sparkles className="h-3.5 w-3.5" /><span className="hidden sm:inline">Generate</span><Send className="h-3 w-3 sm:hidden" /></>
                }
              </button>
            </div>
          </div>
        </div>

        {/* Hint line */}
        {!isRecording && (
          <p className="text-[10px] text-center text-muted-foreground/50 pb-0.5">
            {roastMode
              ? '💀 Brutal mode activated — no sugarcoating'
              : thumbnailMode
              ? `🖼️ AI thumbnail • ${imagesLeft}/${dailyImageLimit} remaining today`
              : 'Enter to generate · Shift+Enter new line · 💀 roast · 🖼️ thumbnail'}
          </p>
        )}
      </div>
    </div>
  );
}
