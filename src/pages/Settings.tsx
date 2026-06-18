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
  Image,
  Sparkles,
  Receipt,
  ShoppingCart,
  Copy,
  Users,
  Gift,
  Share2,
  Twitter,
  ExternalLink,
} from 'lucide-react';
import { useReferralNotifications } from '@/hooks/useReferralNotifications';
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
  const { clearNotifications } = useReferralNotifications();

  useEffect(() => {
    if (user) {
      loadCredits();
      loadTransactions();
      loadReferralStats();
      // Clear sidebar notification badge when user opens settings
      clearNotifications();
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

  const referralLink = `${window.location.origin}/signup?ref=${user?.username}`;

  const handleCopyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
    toast({ title: 'Referral link copied!', description: 'Share it to earn 3 bonus credits per signup.' });
  };

  const tiktokCaption = `POV: you found the AI tool that writes viral TikTok hooks for you in seconds 😭\n\nI've been using ViralForge AI and honestly?? It's insane. It generates scroll-stopping hooks, scripts, and captions instantly.\n\nSign up with my link and we BOTH get free credits 🔥\n${referralLink}\n\n#ViralForgeAI #ContentCreator #AITools #TikTokGrowth #GrowOnTikTok #FYP`;

  const instagramCaption = `Not me finding an AI that literally writes my viral content for me 😭✨\n\nViralForge AI generates hooks, scripts & captions that actually slap. I'm not joking, try it yourself.\n\nLink in bio 👉 ${referralLink}\n(we both get free credits when you sign up 🎁)\n\n#ViralForgeAI #ContentCreator #InstagramGrowth #AITools #Reels`;

  const twitterText = `This AI writes viral TikTok hooks for me in seconds 🤯\n\nBeen using @ViralForgeAI and it's actually goated. Sign up with my link & we both get free credits 👇\n\n${referralLink}`;

  const handleShareTikTok = () => {
    navigator.clipboard.writeText(tiktokCaption);
    toast({ title: '📋 TikTok caption copied!', description: 'Open TikTok, paste this caption, and go viral.' });
    setTimeout(() => window.open('https://www.tiktok.com', '_blank'), 600);
  };

  const handleShareInstagram = () => {
    navigator.clipboard.writeText(instagramCaption);
    toast({ title: '📋 Instagram caption copied!', description: 'Open Instagram, create a Reel, and paste the caption.' });
    setTimeout(() => window.open('https://www.instagram.com', '_blank'), 600);
  };

  const handleShareTwitter = () => {
    const encoded = encodeURIComponent(twitterText);
    window.open(`https://twitter.com/intent/tweet?text=${encoded}`, '_blank');
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
                <div className="flex-1 px-3 py-2.5 rounded-lg bg-muted/30 border border-border/40 text-muted-foreground truncate font-mono text-xs">
                  {referralLink}
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
            </div>

            {/* Social share buttons */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Share your link & go viral</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Each platform gets a ready-to-post caption with your link. Just tap, paste, and post.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {/* TikTok */}
                <button
                  onClick={handleShareTikTok}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 hover:border-primary/30 transition-all group"
                >
                  <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold">TikTok</p>
                    <p className="text-[10px] text-muted-foreground">Copy caption</p>
                  </div>
                </button>

                {/* Instagram */}
                <button
                  onClick={handleShareInstagram}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 hover:border-pink-500/30 transition-all group"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold">Instagram</p>
                    <p className="text-[10px] text-muted-foreground">Copy caption</p>
                  </div>
                </button>

                {/* Twitter/X */}
                <button
                  onClick={handleShareTwitter}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 hover:border-sky-500/30 transition-all group"
                >
                  <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold">Twitter / X</p>
                    <p className="text-[10px] text-muted-foreground">Open tweet</p>
                  </div>
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                💡 TikTok & Instagram copy the caption to your clipboard — just open the app and paste it when creating a post.
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

        {/* Thumbnail Generation Section */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            AI Thumbnail Generator
          </h2>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-violet-500/5 border border-violet-500/20">
              <Sparkles className="h-5 w-5 text-violet-400 mt-0.5" />
              <div className="flex-1 space-y-1">
                <h3 className="text-sm font-semibold">Generate AI Thumbnails in Chat</h3>
                <p className="text-xs text-muted-foreground">
                  Click the <strong className="text-violet-400">🖼️ image button</strong> in chat to switch to Thumbnail Mode, then describe the thumbnail you want for your video.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Limits & Tips</h3>
              <div className="grid gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-violet-400" />
                  <span>Daily limit: <strong>4 thumbnails per day</strong> (resets at midnight)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-violet-400" />
                  <span>Describe your thumbnail in detail — include mood, colors, subject</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-violet-400" />
                  <span>Example: <em>"dark neon gym athlete, red fire background, dramatic lighting"</em></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-violet-400" />
                  <span>Free to use — no credits deducted</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground italic">
              💡 Tip: Generate your hooks + scripts first, then switch to Thumbnail Mode to create a matching visual.
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
