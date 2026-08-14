import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthUser {
  id: string;
  email: string;
  username: string;
  credits: number;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  updateCredits: (credits: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapUser(user: User, credits = 10): AuthUser {
  return {
    id: user.id,
    email: user.email!,
    username: user.user_metadata?.username || user.user_metadata?.full_name || user.email!.split('@')[0],
    credits,
  };
}

async function fetchCredits(userId: string): Promise<number> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('credits_remaining')
      .eq('id', userId)
      .maybeSingle();
    return data?.credits_remaining ?? 10;
  } catch {
    return 10;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Safety #1 — read existing session immediately (handles page refresh)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        const credits = await fetchCredits(session.user.id);
        if (mounted) setUser(mapUser(session.user, credits));
      }
      if (mounted) setLoading(false);
    });

    // Safety #2 — listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        console.log('Auth event:', event);

        if (event === 'SIGNED_IN' && session?.user) {
          const credits = await fetchCredits(session.user.id);
          if (mounted) {
            setUser(mapUser(session.user, credits));
            setLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          const credits = await fetchCredits(session.user.id);
          if (mounted) setUser(mapUser(session.user, credits));
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = (authUser: AuthUser) => {
    setUser(authUser);
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
  };

  const updateCredits = (credits: number) => {
    if (user) setUser({ ...user, credits });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateCredits }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
