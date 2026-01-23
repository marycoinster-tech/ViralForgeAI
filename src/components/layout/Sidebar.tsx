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
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

  useEffect(() => {
    if (user) {
      loadConversations();
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
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <User className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{user?.username}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                {user?.credits} credits
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={() => {
              navigate('/app/settings');
              onClose?.();
            }}
          >
            <SettingsIcon className="h-4 w-4" />
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
    </div>
  );
}
