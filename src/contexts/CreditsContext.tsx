import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface CreditsContextType {
  credits: number;
  refreshCredits: () => Promise<void>;
}

const CreditsContext = createContext<CreditsContextType>({
  credits: 0,
  refreshCredits: async () => {},
});

export function CreditsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [credits, setCredits] = useState(0);

  const refreshCredits = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits_remaining')
        .eq('id', user.id)
        .single();
      if (!error && data) {
        setCredits(data.credits_remaining ?? 0);
      }
    } catch (e) {
      console.error('Failed to refresh credits:', e);
    }
  }, [user?.id]);

  // Load on mount / user change
  useEffect(() => {
    refreshCredits();
  }, [refreshCredits]);

  // Listen to global event dispatched after purchase
  useEffect(() => {
    const handler = () => refreshCredits();
    window.addEventListener('viralforge:credits-updated', handler);
    return () => window.removeEventListener('viralforge:credits-updated', handler);
  }, [refreshCredits]);

  return (
    <CreditsContext.Provider value={{ credits, refreshCredits }}>
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  return useContext(CreditsContext);
}
