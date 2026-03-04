import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Check, Loader2, Zap, Crown } from 'lucide-react';
import { FunctionsHttpError } from '@supabase/supabase-js';

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
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (open) {
      loadCreditPacks();
      loadPaystackScript();
    }
  }, [open]);

  const loadPaystackScript = () => {
    if (document.querySelector('script[src*="paystack"]')) return;
    
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
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
      console.error('Failed to load credit packs:', error);
      toast({
        title: 'Failed to load credit packs',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (cents: number, currency: string) => {
    const amount = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const handlePurchase = async (pack: CreditPack) => {
    setSelectedPack(pack.id);
    setProcessing(true);

    try {
      // Initialize payment
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          action: 'initialize',
          packId: pack.id,
        },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const textContent = await error.context?.text();
            errorMessage = textContent || error.message || 'Unknown error';
          } catch {
            errorMessage = error.message || 'Failed to initialize payment';
          }
        }
        throw new Error(errorMessage);
      }

      const { reference, access_code } = data;

      // Open Paystack Popup
      const handler = window.PaystackPop.setup({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_placeholder',
        email: (await supabase.auth.getUser()).data.user?.email || '',
        amount: pack.price_cents,
        currency: pack.currency,
        ref: reference,
        onClose: () => {
          console.log('Payment popup closed');
          setProcessing(false);
          setSelectedPack(null);
        },
        callback: async (response: any) => {
          console.log('Payment success:', response.reference);
          
          // Verify payment
          await verifyPayment(response.reference, pack.credits);
        },
      });

      handler.openIframe();
    } catch (error: any) {
      console.error('Payment initialization error:', error);
      toast({
        title: 'Payment failed',
        description: error.message,
        variant: 'destructive',
      });
      setProcessing(false);
      setSelectedPack(null);
    }
  };

  const verifyPayment = async (reference: string, credits: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          action: 'verify',
          reference,
        },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const textContent = await error.context?.text();
            errorMessage = textContent || error.message || 'Unknown error';
          } catch {
            errorMessage = error.message || 'Failed to verify payment';
          }
        }
        throw new Error(errorMessage);
      }

      if (data.status === 'success') {
        toast({
          title: 'Credits purchased!',
          description: `${credits} credits have been added to your account 🎉`,
        });
        
        onOpenChange(false);
        setProcessing(false);
        setSelectedPack(null);
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      toast({
        title: 'Payment verification failed',
        description: error.message,
        variant: 'destructive',
      });
      setProcessing(false);
      setSelectedPack(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Buy Credits
          </DialogTitle>
        </DialogHeader>

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
                    <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-primary to-accent text-xs font-bold text-primary-foreground">
                      <Crown className="h-3 w-3" />
                      BEST VALUE
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <h3 className="text-lg font-bold">{pack.name}</h3>
                    {pack.description && (
                      <p className="text-sm text-muted-foreground">{pack.description}</p>
                    )}
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-gradient">
                        {pack.credits}
                      </span>
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
                      disabled={processing}
                      className={`w-full ${
                        pack.is_popular
                          ? 'bg-gradient-to-r from-primary to-accent hover:opacity-90'
                          : ''
                      }`}
                    >
                      {processing && selectedPack === pack.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Buy Now
                        </>
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
              <p>Each AI video costs 10 credits. Credits never expire. Buy more anytime!</p>
            </div>
          </div>
          
          {/* Payment Methods */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
            <p className="text-xs font-medium text-muted-foreground">Accepted payments:</p>
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 rounded bg-background border border-border/40 text-xs font-semibold">
                💳 Card
              </div>
              <div className="px-2.5 py-1 rounded bg-background border border-border/40 text-xs font-semibold">
                🏦 Bank
              </div>
              <div className="px-2.5 py-1 rounded bg-background border border-border/40 text-xs font-semibold">
                 Apple Pay
              </div>
            </div>
          </div>
          
          {/* Apple Pay Notice */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <span className="text-lg shrink-0"></span>
            <div className="text-xs">
              <p className="font-semibold text-foreground mb-1">Apple Pay Available</p>
              <p className="text-muted-foreground leading-relaxed">
                Apple Pay appears automatically on iPhone, iPad & Mac (Safari). 
                Enable it in your Paystack Dashboard → Payment Channels.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
