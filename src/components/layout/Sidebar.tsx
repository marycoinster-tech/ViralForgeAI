import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/contexts/CreditsContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import {
  Zap,
  Plus,
  MessageSquare,
  LogOut,
  Settings as SettingsIcon,
  Sparkles,
  User,
  Trash2,
  ShoppingCart,
  Swords,
  CalendarDays,
  Sun,
  Moon,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BuyCreditsModal } from '@/components/features/BuyCreditsModal';
import { useReferralNotifications } from '@/hooks/useReferralNotifications';
import viralforgerMascot from '@/assets/viralforger-mascot.png';

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { credits, refreshCredits } = useCredits();
  const { theme, setTheme } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const { newReferralCount, clearNotifications } = useReferralNotifications();

  useEffect(() => {
    if (user) loadConversations();
  }, [user]);

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, title, updated_at')
        .order('updated_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    navigate('/app');
    onClose?.();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActiveConversation = (id: string) => location.pathname === `/app/${id}`;

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this conversation? This action cannot be undone.')) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from('conversations').delete().eq('id', id);
      if (error) throw error;
      setConversations(prev => prev.filter(conv => conv.id !== id));
      if (isActiveConversation(id)) navigate('/app');
      toast({ title: 'Deleted', description: 'Conversation deleted' });
    } catch (error: any) {
      toast({ title: 'Failed to delete', description: error.message, variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const navItem = (
    to: string,
    icon: React.ReactNode,
    label: string,
    badge?: string,
    badgeColor = 'bg-primary/10 text-primary',
  ) => {
    const active = location.pathname === to;
    return (
      <Link
        to={to}
        onClick={onClose}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-semibold text-sm ${
          active
            ? 'bg-primary text-primary-foreground shadow-md glow-primary'
            : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'
        }`}
      >
        <span className={active ? 'text-primary-foreground' : 'text-primary'}>{icon}</span>
        <span className="flex-1">{label}</span>
        {badge && !active && (
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
        )}
      </Link>
    );
  };

  return (
    <div className="h-full flex flex-col bg-card border-r border-border/50">
      {/* Brand header */}
      <div className="px-4 pt-5 pb-4 border-b border-border/40">
        <div className="flex items-center gap-3 mb-4">
          <img src={viralforgerMascot} alt="ViralForger" className="h-9 w-9 rounded-xl object-cover" />
          <div>
            <div className="text-base font-black text-gradient leading-none">ViralForge</div>
            <div className="text-[10px] text-muted-foreground font-semibold tracking-wide mt-0.5">AI CONTENT ENGINE</div>
          </div>
        </div>
        <Button
          onClick={handleNewChat}
          className="w-full justify-start gap-2 h-10 font-bold bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"
        >
          <Plus className="h-4 w-4" />
          New Generation
        </Button>
      </div>

      {/* Feature nav */}
      <div className="px-3 pt-3 pb-1 space-y-0.5">
        {navItem('/app/hook-battle', <Swords className="h-4 w-4" />, 'Hook Battle', 'HOT')}
        {navItem('/app/calendar', <CalendarDays className="h-4 w-4" />, 'Content Calendar')}
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-3 pt-2 space-y-0.5">
        <div className="px-2 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          Conversations
        </div>
        {loading ? (
          <div className="p-3 text-center text-sm text-muted-foreground animate-pulse">Loading…</div>
        ) : conversations.length === 0 ? (
          <div className="p-3 text-center text-sm text-muted-foreground">No conversations yet</div>
        ) : (
          conversations.map((conv) => (
            <div key={conv.id} className="relative group/item">
              <Link
                to={`/app/${conv.id}`}
                onClick={onClose}
                className={`flex items-center gap-2.5 px-3 py-2.5 pr-9 rounded-xl transition-all text-sm ${
                  isActiveConversation(conv.id)
                    ? 'bg-primary/10 electric-border text-foreground'
                    : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                <MessageSquare className={`h-3.5 w-3.5 flex-shrink-0 ${isActiveConversation(conv.id) ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="truncate flex-1 text-xs font-medium">{conv.title}</span>
              </Link>
              <button
                onClick={(e) => handleDeleteConversation(conv.id, e)}
                disabled={deletingId === conv.id}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover/item:opacity-100 hover:bg-destructive/10 transition-all"
              >
                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Credits + User */}
      <div className="p-3 border-t border-border/40 space-y-2">
        {/* Credits card */}
        <div className="p-3 rounded-xl bg-primary text-primary-foreground">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-xs font-bold">Credits</span>
            </div>
            <span className="text-2xl font-black leading-none">{credits}</span>
          </div>
          <Button
            onClick={() => setShowBuyCredits(true)}
            size="sm"
            className="w-full h-7 bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground border border-primary-foreground/20 font-bold text-xs"
          >
            <ShoppingCart className="mr-1.5 h-3 w-3" />
            Buy Credits
          </Button>
        </div>

        {/* User row */}
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
          <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="h-3 w-3 text-primary" />
          </div>
          <span className="text-xs font-semibold truncate flex-1 text-muted-foreground">{user?.username}</span>
        </div>

        {/* Action row — settings, theme toggle, logout */}
        <div className="flex gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 relative h-8"
            onClick={() => {
              clearNotifications();
              navigate('/app/settings');
              onClose?.();
            }}
          >
            <SettingsIcon className="h-3.5 w-3.5" />
            {newReferralCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                <span className="relative flex h-3.5 w-3.5 rounded-full bg-primary text-[8px] font-black text-primary-foreground items-center justify-center">
                  {newReferralCount > 9 ? '9+' : newReferralCount}
                </span>
              </span>
            )}
          </Button>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8 hover:bg-primary/10"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-primary" />
            )}
          </Button>

          <Button variant="ghost" size="sm" className="flex-1 h-8" onClick={handleLogout}>
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <BuyCreditsModal
        open={showBuyCredits}
        onOpenChange={setShowBuyCredits}
        onSuccess={() => {
          refreshCredits();
          window.dispatchEvent(new Event('viralforge:credits-updated'));
        }}
      />
    </div>
  );
}
