import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useReferralNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newReferralCount, setNewReferralCount] = useState(0);

  const storageKey = `viralforge_seen_referrals_${user?.id}`;
  const getSeenCount = () => parseInt(localStorage.getItem(storageKey) || '0');
  const saveSeenCount = (count: number) => localStorage.setItem(storageKey, String(count));

  const clearNotifications = async () => {
    setNewReferralCount(0);
    if (!user) return;
    const { count } = await supabase
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', user.id);
    saveSeenCount(count || 0);
  };

  useEffect(() => {
    if (!user) return;

    // Check initial unseen count
    const checkInitial = async () => {
      const { count } = await supabase
        .from('referrals')
        .select('id', { count: 'exact', head: true })
        .eq('referrer_id', user.id);

      const total = count || 0;
      const seen = getSeenCount();
      if (total > seen) {
        setNewReferralCount(total - seen);
      }
    };

    checkInitial();

    // Subscribe to live INSERT events
    const channel = supabase
      .channel(`referrals_notify_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'referrals',
          filter: `referrer_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('New referral received!', payload);
          setNewReferralCount((prev) => prev + 1);
          toast({
            title: '🎉 New referral!',
            description: 'Someone just signed up with your link. You both got 3 bonus credits!',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return { newReferralCount, clearNotifications };
}
