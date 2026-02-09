import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Download, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface VideoMessageProps {
  videoUrl: string;
  prompt?: string;
  duration?: number;
}

export function VideoMessage({ videoUrl, prompt, duration }: VideoMessageProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [watermarkPosition, setWatermarkPosition] = useState<'top-left' | 'bottom-right'>('bottom-right');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setVideoDuration(video.duration);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Animate watermark position (alternates every 5 seconds like Sora)
  useEffect(() => {
    const interval = setInterval(() => {
      setWatermarkPosition(prev => prev === 'bottom-right' ? 'top-left' : 'bottom-right');
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    if (videoRef.current) {
      videoRef.current.currentTime = pos * videoDuration;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `viralforge-ai-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Video downloaded!',
        description: 'Your AI-generated video has been saved',
      });
    } catch (error: any) {
      console.error('Download failed:', error);
      toast({
        title: 'Download failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl space-y-3">
      {prompt && (
        <div className="text-sm text-muted-foreground italic">
          "{prompt}"
        </div>
      )}
      
      <div className="relative group rounded-2xl overflow-hidden bg-black shadow-lg">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-auto"
          onClick={togglePlay}
        />
        
        {/* ViralForge AI Watermark - Alternating Position */}
        <div
          className={`absolute pointer-events-none transition-all duration-1000 ease-in-out ${
            watermarkPosition === 'bottom-right'
              ? 'bottom-4 right-4'
              : 'top-4 left-4'
          }`}
        >
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-sm border border-primary/30">
            <div className="relative">
              <Zap className="h-4 w-4 text-primary fill-primary" />
              <div className="absolute inset-0 blur-md bg-primary/50 animate-pulse" />
            </div>
            <span className="text-xs font-bold text-white tracking-wide">ViralForge AI</span>
          </div>
        </div>
        
        {/* Download Button - Top Right (always visible on hover) */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownload}
            disabled={isDownloading}
            className="h-8 px-3 bg-black/60 hover:bg-black/80 backdrop-blur-sm border border-white/20 text-white"
          >
            {isDownloading ? (
              <div className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        
        {/* Controls overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2 pointer-events-auto">
            {/* Progress bar */}
            <div
              className="h-1 bg-white/30 rounded-full cursor-pointer group/progress"
              onClick={handleSeek}
            >
              <div
                className="h-full bg-primary rounded-full transition-all relative"
                style={{ width: `${(currentTime / videoDuration) * 100}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity" />
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={togglePlay}
                  className="h-8 w-8 text-white hover:bg-white/20"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="h-8 w-8 text-white hover:bg-white/20"
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
                
                <span className="text-xs text-white font-medium">
                  {formatTime(currentTime)} / {formatTime(videoDuration)}
                </span>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="h-8 w-8 text-white hover:bg-white/20"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {duration && (
        <div className="text-xs text-muted-foreground">
          Generated with AI • {duration}s • 1080p
        </div>
      )}
    </div>
  );
}
