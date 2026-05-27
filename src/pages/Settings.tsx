import { useState, useEffect } from 'react';
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
  Film,
  Sparkles,
  Receipt,
  ShoppingCart,
  Copy,
  Users,
  Gift,
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
import { BuyCreditsModal } from '@/components/features/BuyCreditsModal';

export function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const { theme, setTheme, loading: themeLoading } = useTheme();
  
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [credits, setCredits] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [referralStats, setReferralStats] = useState<{ total: number; credited: number } | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  useEffect(() => {
    if (user) {
      loadCredits();
      loadTransactions();
      loadReferralStats();
    }
  }, [user]);

  const loadCredits = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits_remaining')
        .eq('id', user!.id)
        .single();

      if (error) throw error;
      setCredits(data?.credits_remaining || 0);
    } catch (error: any) {
      console.error('Failed to load credits:', error);
    }
  };

  const loadReferralStats = async () => {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select('id, credited_at')
        .eq('referrer_id', user!.id);

      if (error) throw error;
      const total = data?.length || 0;
      const credited = data?.filter(r => r.credited_at).length || 0;
      setReferralStats({ total, credited });
    } catch (error: any) {
      console.error('Failed to load referral stats:', error);
    }
  };

  const handleCopyReferralLink = () => {
    const link = `${window.location.origin}/signup?ref=${user?.username}`;
    navigator.clipboard.writeText(link);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
    toast({ title: 'Referral link copied!', description: 'Share it to earn 3 bonus credits per signup.' });
  };

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, credit_packs(*)')
        .eq('payment_status', 'success')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      console.error('Failed to load transactions:', error);
    }
  };

  const formatPrice = (cents: number, currency: string) => {
    const amount = cents / 100;
    
    // For NGN (Nigerian Naira), use custom formatting with ₦ symbol
    if (currency === 'NGN') {
      return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    
    // For other currencies, use standard formatting
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

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
        {/* Credits & Payments Section */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Credits & Payments
          </h2>

          <div className="space-y-4">
            {/* Current Balance */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Available Credits</p>
                  <p className="text-4xl font-black text-gradient">{credits}</p>
                </div>
                <Sparkles className="h-12 w-12 text-primary opacity-20" />
              </div>
              <Button
                onClick={() => setShowBuyCredits(true)}
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Buy More Credits
              </Button>
            </div>

            {/* Transaction History */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                Recent Purchases
              </h3>
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No purchases yet. Buy credits to start creating AI videos!
                </p>
              ) : (
                <div className="space-y-2">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-semibold">
                          {tx.credit_packs?.name || 'Credit Pack'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(tx.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">+{tx.credits_purchased}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPrice(tx.amount_cents, tx.currency)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Referral Section */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Referral Program
          </h2>

          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 text-center">
                <p className="text-3xl font-black text-gradient">{referralStats?.total ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Friends referred</p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 text-center">
                <p className="text-3xl font-black text-green-400">{(referralStats?.total ?? 0) * 3}</p>
                <p className="text-xs text-muted-foreground mt-1">Credits earned</p>
              </div>
            </div>

            {/* How it works */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border/40 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">How it works</p>
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold shrink-0">1.</span>
                  <span>Share your unique referral link with friends</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold shrink-0">2.</span>
                  <span>They sign up using your link</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold shrink-0">3.</span>
                  <span>Both of you get <strong className="text-foreground">3 bonus credits</strong> instantly</span>
                </div>
              </div>
            </div>

            {/* Referral link */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Your referral link</label>
              <div className="flex gap-2">
                <div className="flex-1 px-3 py-2.5 rounded-lg bg-muted/30 border border-border/40 text-sm text-muted-foreground truncate font-mono text-xs">
                  {window.location.origin}/signup?ref={user?.username}
                </div>
                <Button
                  onClick={handleCopyReferralLink}
                  variant="outline"
                  className="shrink-0 border-primary/20 hover:bg-primary/10"
                >
                  {copiedRef ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share on TikTok, Instagram, or anywhere your audience is. Every signup = free credits for both of you.
              </p>
            </div>
          </div>
        </div>

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

        {/* Video Generation Section */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Film className="h-5 w-5 text-primary" />
            AI Video Generation
          </h2>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1 space-y-1">
                <h3 className="text-sm font-semibold">Generate AI Videos in Chat</h3>
                <p className="text-xs text-muted-foreground">
                  Create stunning AI videos directly in your conversations. Click the video button in the chat input!
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Pricing & Limits</h3>
              <div className="grid gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  <span>Cost: <strong>10 credits per video</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  <span>Duration: <strong>Sora 2: 4/8/12s • Veo 3.1: 4-28s</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  <span>Formats: Landscape (16:9), Portrait (9:16), Square (1:1)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  <span>Styles: Realistic (Sora 2), Cartoon (Veo 3.1)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  <span>Daily Limit: 3 videos per day</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground italic">
              💡 Tip: Toggle video mode in chat, set your preferences, and describe your video. The AI handles the rest!
            </p>
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

      {/* Buy Credits Modal */}
      <BuyCreditsModal
        open={showBuyCredits}
        onOpenChange={setShowBuyCredits}
        onSuccess={() => {
          loadCredits();
          loadTransactions();
        }}
      />
    </div>
  );
}
