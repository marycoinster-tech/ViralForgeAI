import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useCredits } from '@/contexts/CreditsContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Menu, Zap, Sparkles, Sun, Moon, Download } from 'lucide-react';

interface MobileNavProps {
  onMenuClick: () => void;
}

export function MobileNav({ onMenuClick }: MobileNavProps) {
  const { credits } = useCredits();
  const { theme, setTheme } = useTheme();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowInstall(false);
    setDeferredPrompt(null);
  };

  return (
    <div className="lg:hidden sticky top-0 z-40 w-full border-b border-border/40 backdrop-blur bg-background/90 supports-[backdrop-filter]:bg-background/70">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onMenuClick} className="h-9 w-9 p-0">
            <Menu className="h-5 w-5" />
          </Button>
          {/* PWA install button */}
          {showInstall && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleInstall}
              className="h-8 px-2 text-xs font-bold text-primary hover:bg-primary/10 gap-1"
            >
              <Download className="h-3.5 w-3.5" />
              Install
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Zap className="h-5 w-5 text-primary" fill="currentColor" />
          <span className="text-lg font-black text-gradient">ViralForge</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-8 w-8 p-0 rounded-full hover:bg-primary/10"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-primary" />
            ) : (
              <Moon className="h-4 w-4 text-primary" />
            )}
          </Button>

          {/* Credits pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-primary text-primary-foreground shadow-md">
            <Sparkles className="h-3 w-3" />
            <span className="text-xs font-black">{credits}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
