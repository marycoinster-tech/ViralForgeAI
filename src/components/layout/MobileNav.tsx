import { Button } from '@/components/ui/button';
import { useCredits } from '@/contexts/CreditsContext';
import { Menu, Zap, Sparkles } from 'lucide-react';

interface MobileNavProps {
  onMenuClick: () => void;
}

export function MobileNav({ onMenuClick }: MobileNavProps) {
  const { credits } = useCredits();

  return (
    <div className="lg:hidden sticky top-0 z-40 w-full border-b border-border/40 glass backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-14 items-center justify-between px-4">
        <Button variant="ghost" size="sm" onClick={onMenuClick} className="h-9 w-9 p-0">
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" fill="currentColor" />
          <span className="text-lg font-black text-gradient">ViralForge</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-primary text-primary-foreground shadow-md">
          <Sparkles className="h-3 w-3" />
          <span className="text-xs font-black">{credits}</span>
        </div>
      </div>
    </div>
  );
}
