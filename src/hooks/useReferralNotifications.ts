import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useReferralNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newReferralCount, setNewReferralCount] = useState(0);
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const getStorageKey = useCallback(() => `viralforge_seen_referrals_${user?.id}`, [user?.id]);
  const getSeenCount = useCallback(() => parseInt(localStorage.getItem(getStorageKey()) || '0'), [getStorageKey]);
  const saveSeenCount = useCallback((count: number) => localStorage.setItem(getStorageKey(), String(count)), [getStorageKey]);

  const clearNotifications = useCallback(async () => {
    setNewReferralCount(0);
    if (!user) return;
    try {
      const { count } = await supabase
        .from('referrals')
        .select('id', { count: 'exact', head: true })
        .eq('referrer_id', user.id);
      saveSeenCount(count || 0);
    } catch (e) {
      console.error('clearNotifications error:', e);
    }
  }, [user, saveSeenCount]);

  useEffect(() => {
    if (!user?.id) return;

    let mounted = true;

    // Check initial unseen count — single lightweight query
    const checkInitial = async () => {
      try {
        const { count } = await supabase
          .from('referrals')
          .select('id', { count: 'exact', head: true })
          .eq('referrer_id', user.id);

        if (!mounted) return;
        const total = count || 0;
        const seen = parseInt(localStorage.getItem(`viralforge_seen_referrals_${user.id}`) || '0');
        if (total > seen) {
          setNewReferralCount(total - seen);
        }
      } catch (e) {
        console.error('referral check error:', e);
      }
    };

    checkInitial();

    // Subscribe to live INSERT events — single channel per user
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
        () => {
          if (!mounted) return;
          setNewReferralCount((prev) => prev + 1);
          toastRef.current({
            title: '🎉 New referral!',
            description: 'Someone signed up with your link. You both got 3 bonus credits!',
          });
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return { newReferralCount, clearNotifications };
}
