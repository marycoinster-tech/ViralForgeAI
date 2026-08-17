import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Module-level registry — one channel per userId, shared across StrictMode double-mounts.
 * This prevents the "cannot add callbacks after subscribe()" crash in any environment.
 */
const channelRegistry = new Map<string, RealtimeChannel>();

function removeUserChannel(userId: string) {
  const existing = channelRegistry.get(userId);
  if (existing) {
    try {
      supabase.removeChannel(existing);
    } catch { /* ignore */ }
    channelRegistry.delete(userId);
  }
}

export function useReferralNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newReferralCount, setNewReferralCount] = useState(0);
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const mountedRef = useRef(false);

  const storageKey = user?.id ? `viralforge_seen_referrals_${user.id}` : null;

  const clearNotifications = useCallback(async () => {
    setNewReferralCount(0);
    if (!user?.id || !storageKey) return;
    try {
      const { count } = await supabase
        .from('referrals')
        .select('id', { count: 'exact', head: true })
        .eq('referrer_id', user.id);
      localStorage.setItem(storageKey, String(count || 0));
    } catch (e) {
      console.error('clearNotifications error:', e);
    }
  }, [user?.id, storageKey]);

  useEffect(() => {
    if (!user?.id) return;
    mountedRef.current = true;

    const userId = user.id;

    // Tear down any existing channel for this user first
    removeUserChannel(userId);

    // Check initial unseen count
    const checkInitial = async () => {
      try {
        const { count } = await supabase
          .from('referrals')
          .select('id', { count: 'exact', head: true })
          .eq('referrer_id', userId);

        if (!mountedRef.current) return;
        const total = count || 0;
        const key = `viralforge_seen_referrals_${userId}`;
        const seen = parseInt(localStorage.getItem(key) || '0');
        if (total > seen) setNewReferralCount(total - seen);
      } catch (e) {
        console.error('referral check error:', e);
      }
    };

    checkInitial();

    // Build a fresh channel — add listener BEFORE subscribe (required by Supabase)
    const channelName = `referrals_notify_${userId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'referrals',
          filter: `referrer_id=eq.${userId}`,
        },
        () => {
          if (!mountedRef.current) return;
          setNewReferralCount((prev) => prev + 1);
          toastRef.current({
            title: '🎉 New referral!',
            description: 'Someone signed up with your link. You both got 3 bonus credits!',
          });
        }
      )
      .subscribe();

    channelRegistry.set(userId, channel);

    return () => {
      mountedRef.current = false;
      removeUserChannel(userId);
    };
  }, [user?.id]);

  return { newReferralCount, clearNotifications };
}
