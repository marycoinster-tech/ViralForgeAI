import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
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
  Dna,
  CalendarDays,
  Radio,
  Hash
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BuyCreditsModal } from '@/components/features/BuyCreditsModal';
import { useReferralNotifications } from '@/hooks/useReferralNotifications';

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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const { newReferralCount, clearNotifications } = useReferralNotifications();

  useEffect(() => {
    if (user) {
      loadConversations();
      loadCredits();
    }
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

  const loadCredits = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits_remaining')
        .eq('id', user!.id)
        .single();

      if (error) throw error;
      setCredits(data?.credits_remaining || 0);
    } catch (error) {
      console.error('Failed to load credits:', error);
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

  const isActiveConversation = (id: string) => {
    return location.pathname === `/app/${id}`;
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Confirm deletion
    if (!confirm('Delete this conversation? This action cannot be undone.')) {
      return;
    }

    setDeletingId(id);

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Remove from local state
      setConversations(prev => prev.filter(conv => conv.id !== id));

      // If deleting the active conversation, redirect to new chat
      if (isActiveConversation(id)) {
        navigate('/app');
      }

      toast({
        title: 'Deleted',
        description: 'Conversation deleted successfully',
      });
    } catch (error: any) {
      console.error('Failed to delete conversation:', error);
      toast({
        title: 'Failed to delete',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-card/30 border-r border-border/40">
      {/* Header */}
      <div className="p-4 border-b border-border/40">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative">
            <Zap className="h-6 w-6 text-primary" fill="currentColor" />
            <div className="absolute inset-0 blur-lg bg-primary/50" />
          </div>
          <span className="text-lg font-black text-gradient">ViralForge</span>
        </div>

        <Button
          onClick={handleNewChat}
          className="w-full justify-start gap-2 h-10"
          variant="default"
        >
          <Plus className="h-4 w-4" />
          New Generation
        </Button>
      </div>

      {/* Feature Nav */}
      <div className="px-3 pt-3 pb-1 space-y-1">
        <Link
          to="/app/hook-battle"
          onClick={onClose}
          className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors group ${
            location.pathname === '/app/hook-battle'
              ? 'bg-primary/10 border border-primary/20 text-primary'
              : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
          }`}
        >
          <Swords className="h-4 w-4 shrink-0" />
          <span className="text-sm font-semibold">Hook Battle</span>
          <span className="ml-auto text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">NEW</span>
        </Link>
        <Link
          to="/app/viral-dna"
          onClick={onClose}
          className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors group ${
            location.pathname === '/app/viral-dna'
              ? 'bg-accent/10 border border-accent/20 text-accent'
              : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
          }`}
        >
          <Dna className="h-4 w-4 shrink-0" />
          <span className="text-sm font-semibold">Viral DNA</span>
          <span className="ml-auto text-[10px] font-bold bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">NEW</span>
        </Link>
        <Link
          to="/app/calendar"
          onClick={onClose}
          className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors group ${
            location.pathname === '/app/calendar'
              ? 'bg-green-500/10 border border-green-500/20 text-green-400'
              : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
          }`}
        >
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span className="text-sm font-semibold">Content Calendar</span>
          <span className="ml-auto text-[10px] font-bold bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded-full">NEW</span>
        </Link>
        <Link
          to="/app/insights"
          onClick={onClose}
          className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors group ${
            location.pathname === '/app/insights'
              ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400'
              : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
          }`}
        >
          <Radio className="h-4 w-4 shrink-0" />
          <span className="text-sm font-semibold">Trend Signals</span>
          <span className="ml-auto text-[10px] font-bold bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded-full">NEW</span>
        </Link>
        <Link
          to="/app/hashtags"
          onClick={onClose}
          className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors group ${
            location.pathname === '/app/hashtags'
              ? 'bg-violet-500/10 border border-violet-500/20 text-violet-400'
              : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
          }`}
        >
          <Hash className="h-4 w-4 shrink-0" />
          <span className="text-sm font-semibold">Hashtag Intel</span>
          <span className="ml-auto text-[10px] font-bold bg-violet-500/10 text-violet-400 px-1.5 py-0.5 rounded-full">NEW</span>
        </Link>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Conversations
        </div>
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No conversations yet
          </div>
        ) : (
          conversations.map((conv) => (
            <div key={conv.id} className="relative group/item">
              <Link
                to={`/app/${conv.id}`}
                onClick={onClose}
                className={`flex items-center gap-3 p-3 pr-10 rounded-lg transition-colors group ${
                  isActiveConversation(conv.id)
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-muted/50'
                }`}
              >
                <MessageSquare className={`h-4 w-4 flex-shrink-0 ${
                  isActiveConversation(conv.id)
                    ? 'text-primary'
                    : 'text-muted-foreground group-hover:text-primary'
                }`} />
                <span className="text-sm truncate flex-1">
                  {conv.title}
                </span>
              </Link>
              <button
                onClick={(e) => handleDeleteConversation(conv.id, e)}
                disabled={deletingId === conv.id}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded opacity-0 group-hover/item:opacity-100 hover:bg-destructive/10 transition-all disabled:opacity-50"
                title="Delete conversation"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-border/40 space-y-2">
        {/* Credits Display */}
        <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Credits</span>
            </div>
            <span className="text-2xl font-black text-gradient">{credits}</span>
          </div>
          <Button
            onClick={() => setShowBuyCredits(true)}
            size="sm"
            className="w-full h-8 bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            <ShoppingCart className="mr-2 h-3.5 w-3.5" />
            Buy Credits
          </Button>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm truncate flex-1">{user?.username}</span>
        </div>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 relative"
            onClick={() => {
              clearNotifications();
              navigate('/app/settings');
              onClose?.();
            }}
          >
            <SettingsIcon className="h-4 w-4" />
            {newReferralCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 text-[8px] font-black text-white items-center justify-center">
                  {newReferralCount > 9 ? '9+' : newReferralCount}
                </span>
              </span>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Buy Credits Modal */}
      <BuyCreditsModal
        open={showBuyCredits}
        onOpenChange={setShowBuyCredits}
        onSuccess={loadCredits}
      />
    </div>
  );
}
