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
  User
} from 'lucide-react';

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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

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
            <Link
              key={conv.id}
              to={`/app/${conv.id}`}
              onClick={onClose}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors group ${
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
