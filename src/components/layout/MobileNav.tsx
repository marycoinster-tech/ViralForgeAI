import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, Zap, Sparkles } from 'lucide-react';

interface MobileNavProps {
  onMenuClick: () => void;
}

export function MobileNav({ onMenuClick }: MobileNavProps) {
  const { user } = useAuth();

  return (
    <div className="lg:hidden sticky top-0 z-40 w-full border-b border-border/40 glass backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" fill="currentColor" />
          <span className="text-lg font-black text-gradient">ViralForge</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
          <Sparkles className="h-3 w-3 text-primary" />
          <span className="text-xs font-semibold text-primary">{user?.credits}</span>
        </div>
      </div>
    </div>
  );
}
