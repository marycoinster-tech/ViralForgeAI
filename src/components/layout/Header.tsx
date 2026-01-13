import { Zap } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 glass backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Zap className="h-7 w-7 text-primary animate-glow-pulse" fill="currentColor" />
            <div className="absolute inset-0 blur-xl bg-primary/50 animate-pulse" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            <span className="text-gradient">ViralForge</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold text-primary">Free Credits: ∞</span>
          </div>
        </div>
      </div>
    </header>
  );
}
