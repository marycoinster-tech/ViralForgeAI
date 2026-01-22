import { useState, useRef, useEffect } from 'react';
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
  const [isPaused, setIsPaused] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [frequencyBars, setFrequencyBars] = useState<number[]>(new Array(20).fill(0));
  const mediaRecorderRef = useRef<any | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

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

  // Cleanup audio visualization on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Audio visualization - reactive to actual voice
  const startAudioVisualization = async (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 512; // Higher resolution for better visualization
      analyser.smoothingTimeConstant = 0.3; // Smoother transitions
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateLevel = () => {
        if (!analyserRef.current || isPaused) {
          // Keep animation going even when paused, but with minimal values
          if (isPaused) {
            setAudioLevel(0);
            setFrequencyBars(new Array(20).fill(0));
          }
          if (!isPaused) {
            animationFrameRef.current = requestAnimationFrame(updateLevel);
          }
          return;
        }
        
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Split frequency data into 20 bands for each bar
        const bandSize = Math.floor(dataArray.length / 20);
        const bars: number[] = [];
        
        for (let i = 0; i < 20; i++) {
          const start = i * bandSize;
          const end = start + bandSize;
          const band = dataArray.slice(start, end);
          const average = band.reduce((a, b) => a + b, 0) / band.length;
          bars.push(average / 255); // Normalize to 0-1
        }
        
        // Get overall audio level for reactive feedback
        const overallLevel = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        
        // Update state with both overall level and individual bars
        setAudioLevel(overallLevel / 255); // Normalize to 0-1
        setFrequencyBars(bars);
        
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
    } catch (error) {
      console.error('Audio visualization error:', error);
    }
  };

  // Voice recording using Web Speech API
  const startVoiceRecording = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    try {
      // Start audio visualization
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      await startAudioVisualization(stream);

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        setIsPaused(false);
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
        stopVoiceRecording();
      };

      recognition.onend = () => {
        // Only stop if not paused (pause will restart recognition)
        if (!isPaused) {
          stopVoiceRecording();
        }
      };

      recognition.start();
      mediaRecorderRef.current = recognition;
    } catch (error) {
      console.error('Failed to start voice recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const pauseVoiceRecording = () => {
    if (mediaRecorderRef.current && !isPaused) {
      mediaRecorderRef.current.stop();
      setIsPaused(true);
      setAudioLevel(0);
      setFrequencyBars(new Array(20).fill(0));
    }
  };

  const resumeVoiceRecording = () => {
    if (isPaused && isRecording) {
      setIsPaused(false);
      
      // Restart speech recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          setCustomTopic((prev) => prev + finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        stopVoiceRecording();
      };

      recognition.start();
      mediaRecorderRef.current = recognition;
      
      // Resume audio visualization
      if (analyserRef.current && animationFrameRef.current === null) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        const updateLevel = () => {
          if (!analyserRef.current || isPaused) return;
          
          analyserRef.current.getByteFrequencyData(dataArray);
          const bandSize = Math.floor(dataArray.length / 20);
          const bars: number[] = [];
          
          for (let i = 0; i < 20; i++) {
            const start = i * bandSize;
            const end = start + bandSize;
            const band = dataArray.slice(start, end);
            const average = band.reduce((a, b) => a + b, 0) / band.length;
            bars.push(average / 255);
          }
          
          const overallLevel = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(overallLevel / 255);
          setFrequencyBars(bars);
          
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      }
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    setIsRecording(false);
    setIsPaused(false);
    setAudioLevel(0);
    setFrequencyBars(new Array(20).fill(0));
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

        {/* Recording Indicator with Reactive Waveform */}
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
                  // Each bar shows actual frequency data
                  const baseHeight = 4;
                  const maxHeight = 40;
                  // Use individual frequency bar data
                  const height = isPaused 
                    ? baseHeight 
                    : Math.max(baseHeight, Math.min(maxHeight, level * maxHeight * 1.5));
                  
                  return (
                    <div
                      key={i}
                      className="w-1 bg-gradient-to-t from-primary via-accent to-primary rounded-full transition-all duration-75 ease-out"
                      style={{ 
                        height: `${height}px`,
                        opacity: isPaused ? 0.3 : 1
                      }}
                    />
                  );
                })}
              </div>
              <span className="text-xs text-muted-foreground">
                {isPaused ? 'Tap resume' : 'Speaking...'}
              </span>
            </div>
            
            {/* Pause/Resume/Stop Controls */}
            <div className="flex items-center justify-center gap-2">
              {isPaused ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={resumeVoiceRecording}
                  className="h-8 px-4 border-primary/40 hover:bg-primary/10"
                >
                  Resume
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={pauseVoiceRecording}
                  className="h-8 px-4 border-yellow-500/40 hover:bg-yellow-500/10"
                >
                  Pause
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={stopVoiceRecording}
                className="h-8 px-4 border-destructive/40 hover:bg-destructive/10"
              >
                Stop
              </Button>
            </div>
          </div>
        )}

        {!isRecording && (
          <p className="text-xs text-center text-muted-foreground">
            Press Enter to generate • Shift + Enter for new line • Click mic for voice input
          </p>
        )}
      </div>
    </div>
  );
}
