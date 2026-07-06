import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useCredits } from '@/contexts/CreditsContext';
import { Sparkles, Check, Loader2, Zap, Crown } from 'lucide-react';
import { PurchaseCelebration } from '@/components/features/PurchaseCelebration';

interface CreditPack {
  id: string;
  name: string;
  description: string | null;
  credits: number;
  price_cents: number;
  currency: string;
  is_popular: boolean;
}

interface BuyCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

declare global {
  interface Window {
    PaystackPop: any;
  }
}

export function BuyCreditsModal({ open, onOpenChange, onSuccess }: BuyCreditsModalProps) {
  const { toast } = useToast();
  const { credits, refreshCredits } = useCredits();
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Purchase celebration state
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationCredits, setCelebrationCredits] = useState(0);
  const [celebrationTotal, setCelebrationTotal] = useState(0);

  useEffect(() => {
    if (open) {
      loadCreditPacks();
      loadPaystackScript();
    }
  }, [open]);

  const loadPaystackScript = () => {
    if (window.PaystackPop) { setScriptLoaded(true); return; }
    if (document.querySelector('script[src*="paystack"]')) {
      const checkLoaded = setInterval(() => {
        if (window.PaystackPop) { setScriptLoaded(true); clearInterval(checkLoaded); }
      }, 100);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () =>
      toast({ title: 'Payment system unavailable', description: 'Please refresh the page.', variant: 'destructive' });
    document.body.appendChild(script);
  };

  const loadCreditPacks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('credit_packs')
        .select('*')
        .eq('is_active', true)
        .order('price_cents', { ascending: true });
      if (error) throw error;
      setPacks(data || []);
    } catch (error: any) {
      toast({ title: 'Failed to load credit packs', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (cents: number, currency: string) => {
    const amount = cents / 100;
    if (currency === 'NGN') {
      return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };

  const handlePurchase = async (pack: CreditPack) => {
    if (!window.PaystackPop) {
      toast({ title: 'Payment system loading…', description: 'Please wait a moment and try again.' });
      return;
    }
    setSelectedPack(pack.id);
    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('Please log in to purchase credits');

      const paystackKey = 'pk_live_3b65c6106f2389c6c426c2a5d349e7b7bf78d305';
      const reference = `vf-${user.id.substring(0, 8)}-${Date.now()}`;

      const handler = window.PaystackPop.setup({
        key: paystackKey,
        email: user.email,
        amount: pack.price_cents,
        currency: pack.currency.toUpperCase(),
        ref: reference,
        metadata: { user_id: user.id, pack_id: pack.id, credits: pack.credits },
        onClose: () => { setProcessing(false); setSelectedPack(null); },
        callback: (response: any) => {
          verifyPayment(response.reference, pack.id, pack.credits).catch(() => {
            setProcessing(false);
            setSelectedPack(null);
          });
        },
      });
      handler.openIframe();
    } catch (error: any) {
      toast({ title: 'Payment failed', description: error.message, variant: 'destructive' });
      setProcessing(false);
      setSelectedPack(null);
    }
  };

  const verifyPayment = async (reference: string, packId: string, creditsAdded: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { action: 'verify', reference, packId },
      });

      if (error) {
        let errorMessage = error.message;
        try {
          const t = await (error as any).context?.text?.();
          if (t) errorMessage = t;
        } catch { /* noop */ }
        throw new Error(errorMessage);
      }

      if (data.status === 'success') {
        // Close buy modal
        onOpenChange(false);
        setProcessing(false);
        setSelectedPack(null);

        // Refresh credits globally
        await refreshCredits();
        window.dispatchEvent(new Event('viralforge:credits-updated'));

        // Get new total from context (after refresh)
        const { data: profile } = await supabase
          .from('profiles')
          .select('credits_remaining')
          .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
          .single();

        const newTotal = profile?.credits_remaining ?? (credits + creditsAdded);

        // Show celebration
        setCelebrationCredits(creditsAdded);
        setCelebrationTotal(newTotal);
        setShowCelebration(true);

        if (onSuccess) onSuccess();
      } else {
        throw new Error(data.message || 'Payment verification failed');
      }
    } catch (error: any) {
      toast({
        title: 'Verification failed',
        description: error.message || 'Could not verify payment. Contact support if debited.',
        variant: 'destructive',
      });
      setProcessing(false);
      setSelectedPack(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              Buy Credits
            </DialogTitle>
          </DialogHeader>
          <p className="sr-only">
            Purchase credit packs to generate AI content. Choose from Starter, Creator, or Pro packs.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-4 py-4">
              {packs.map((pack) => (
                <div
                  key={pack.id}
                  className={`relative glass-card p-6 transition-all ${
                    pack.is_popular ? 'border-2 border-primary' : ''
                  }`}
                >
                  {pack.is_popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-black">
                        <Crown className="h-3 w-3" />
                        BEST VALUE
                      </div>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <h3 className="text-lg font-black">{pack.name}</h3>
                      {pack.description && (
                        <p className="text-sm text-muted-foreground">{pack.description}</p>
                      )}
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-gradient">{pack.credits}</span>
                        <span className="text-muted-foreground">credits</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Sparkles className="h-3 w-3" />
                        <span>{Math.floor(pack.credits / 10)} AI videos</span>
                      </div>
                    </div>

                    <div className="text-right space-y-3">
                      <div className="text-3xl font-black">
                        {formatPrice(pack.price_cents, pack.currency)}
                      </div>
                      <Button
                        onClick={() => handlePurchase(pack)}
                        disabled={processing || !scriptLoaded}
                        className={`w-full ${
                          pack.is_popular
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90 glow-primary'
                            : ''
                        }`}
                      >
                        {processing && selectedPack === pack.id ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Opening payment...</>
                        ) : !scriptLoaded ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</>
                        ) : (
                          <><Check className="mr-2 h-4 w-4" /> Buy Now</>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-border/40 pt-4 space-y-3">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">Secure payment powered by Paystack</p>
                <p>Each AI generation costs 1 credit. Credits never expire. Buy more anytime!</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
              <p className="text-xs font-medium text-muted-foreground">Accepted:</p>
              <div className="flex items-center gap-2">
                <div className="px-2.5 py-1 rounded bg-background border border-border/40 text-xs font-semibold">💳 Card</div>
                <div className="px-2.5 py-1 rounded bg-background border border-border/40 text-xs font-semibold">🏦 Bank</div>
                <div className="px-2.5 py-1 rounded bg-background border border-border/40 text-xs font-semibold"> Apple Pay</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Purchase celebration overlay */}
      <PurchaseCelebration
        open={showCelebration}
        creditsAdded={celebrationCredits}
        newTotal={celebrationTotal}
        onClose={() => setShowCelebration(false)}
      />
    </>
  );
}
