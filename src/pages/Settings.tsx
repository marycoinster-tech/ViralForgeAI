import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, 
  Moon, 
  Sun, 
  Globe, 
  Trash2, 
  Loader2,
  AlertCircle,
  Check,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const { theme, setTheme, loading: themeLoading } = useTheme();
  
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    setLoading(true);
    try {
      await setTheme(newTheme);
      toast({
        title: 'Theme updated',
        description: `Switched to ${newTheme} mode`,
      });
    } catch (error: any) {
      toast({
        title: 'Failed to update theme',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = async (newLanguage: string) => {
    setLanguage(newLanguage);
    toast({
      title: 'Language preference saved',
      description: 'Full translation support coming soon!',
    });
  };

  const handleDeleteAllChats = async () => {
    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('user_id', user!.id);

      if (error) throw error;

      toast({
        title: 'All chats deleted',
        description: 'Your conversation history has been cleared',
      });

      navigate('/app');
    } catch (error: any) {
      toast({
        title: 'Failed to delete chats',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      // Soft delete: set deleted_at timestamp
      const { error } = await supabase
        .from('profiles')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', user!.id);

      if (error) throw error;

      toast({
        title: 'Account deleted',
        description: 'Your account has been scheduled for deletion',
      });

      // Sign out
      await logout();
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Failed to delete account',
        description: error.message,
        variant: 'destructive',
      });
      setDeleteLoading(false);
    }
  };

  if (themeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/30 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/app')}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Appearance Section */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            {theme === 'dark' ? (
              <Moon className="h-5 w-5 text-primary" />
            ) : (
              <Sun className="h-5 w-5 text-primary" />
            )}
            Appearance
          </h2>

          <div className="space-y-3">
            <label className="text-sm font-medium">Theme</label>
            <div className="flex gap-2">
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                onClick={() => handleThemeChange('dark')}
                disabled={loading}
                className="flex-1"
              >
                <Moon className="mr-2 h-4 w-4" />
                Dark
                {theme === 'dark' && <Check className="ml-auto h-4 w-4" />}
              </Button>
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                onClick={() => handleThemeChange('light')}
                disabled={loading}
                className="flex-1"
              >
                <Sun className="mr-2 h-4 w-4" />
                Light
                {theme === 'light' && <Check className="ml-auto h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Language Section */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Language
          </h2>

          <div className="space-y-3">
            <label className="text-sm font-medium">Preferred Language</label>
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger disabled={loading}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">🇺🇸 English</SelectItem>
                <SelectItem value="es">🇪🇸 Español</SelectItem>
                <SelectItem value="fr">🇫🇷 Français</SelectItem>
                <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
                <SelectItem value="pt">🇧🇷 Português</SelectItem>
                <SelectItem value="zh">🇨🇳 中文</SelectItem>
                <SelectItem value="ja">🇯🇵 日本語</SelectItem>
                <SelectItem value="ko">🇰🇷 한국어</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Note: Full language translation is coming soon. Currently storing preference only.
            </p>
          </div>
        </div>

        {/* Data & Privacy Section */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-primary" />
            Data & Privacy
          </h2>

          <div className="space-y-4">
            {/* Delete All Chats */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Delete Chat History</h3>
              <p className="text-sm text-muted-foreground">
                This will permanently delete all your conversations and messages.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={deleteLoading}
                    className="border-destructive/40 hover:bg-destructive/10"
                  >
                    {deleteLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete All Chats
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete all your
                      conversations and generated content.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAllChats}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Delete All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="glass-card p-6 space-y-4 border-destructive/20">
          <h2 className="text-lg font-bold flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Danger Zone
          </h2>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Delete Account</h3>
            <p className="text-sm text-muted-foreground">
              This will soft delete your account. Your data will be marked for deletion
              and you will be logged out immediately.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Delete My Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your account, profile, and all associated data.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Yes, Delete My Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
}
