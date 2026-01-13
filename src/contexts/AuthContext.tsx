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

function mapSupabaseUser(user: User, credits?: number): AuthUser {
  return {
    id: user.id,
    email: user.email!,
    username: user.user_metadata?.username || user.email!.split('@')[0],
    credits: credits ?? 10,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileCreationAttempted, setProfileCreationAttempted] = useState<Set<string>>(new Set());

  // Helper to ensure profile exists with retry prevention
  const ensureProfileExists = async (userId: string, email: string, username: string) => {
    // Prevent duplicate creation attempts for the same user
    if (profileCreationAttempted.has(userId)) {
      console.log('Profile creation already attempted for this user');
      return null;
    }

    try {
      // First check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id, credits_remaining')
        .eq('id', userId)
        .maybeSingle();

      if (existingProfile) {
        console.log('Profile already exists');
        return existingProfile.credits_remaining ?? 10;
      }

      // Profile doesn't exist, create it
      console.log('Creating new profile for user:', userId);
      setProfileCreationAttempted(prev => new Set(prev).add(userId));

      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          username: username,
          credits_remaining: 10,
        })
        .select()
        .single();

      if (createError) {
        // Check if it's a duplicate key error (profile was created by trigger or another request)
        if (createError.code === '23505') {
          console.log('Profile was created by another process, fetching it');
          const { data: fetchedProfile } = await supabase
            .from('profiles')
            .select('credits_remaining')
            .eq('id', userId)
            .single();
          return fetchedProfile?.credits_remaining ?? 10;
        }
        
        console.error('Failed to create profile:', createError);
        return 10; // Default credits
      }

      return newProfile?.credits_remaining ?? 10;
    } catch (error) {
      console.error('Error ensuring profile exists:', error);
      return 10; // Default credits
    }
  };

  useEffect(() => {
    let mounted = true;
    let sessionCheckComplete = false;

    // Check existing session
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (session?.user) {
          const username = session.user.user_metadata?.username || session.user.email!.split('@')[0];
          const credits = await ensureProfileExists(session.user.id, session.user.email!, username);
          
          if (mounted) {
            setUser(mapSupabaseUser(session.user, credits ?? 10));
          }
        }
      } catch (error) {
        console.error('Session initialization error:', error);
      } finally {
        if (mounted) {
          setLoading(false);
          sessionCheckComplete = true;
        }
      }
    };

    initSession();

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
        
        if (!mounted || !sessionCheckComplete) return;
        
        try {
          if (event === 'SIGNED_IN' && session?.user) {
            const username = session.user.user_metadata?.username || session.user.email!.split('@')[0];
            const credits = await ensureProfileExists(session.user.id, session.user.email!, username);
            
            if (mounted) {
              setUser(mapSupabaseUser(session.user, credits ?? 10));
            }
          } else if (event === 'SIGNED_OUT') {
            if (mounted) {
              setUser(null);
              setProfileCreationAttempted(new Set()); // Reset on sign out
            }
          } else if (event === 'TOKEN_REFRESHED' && session?.user) {
            // Just fetch profile, don't create
            const { data: profile } = await supabase
              .from('profiles')
              .select('credits_remaining')
              .eq('id', session.user.id)
              .maybeSingle();
            
            if (mounted) {
              setUser(mapSupabaseUser(session.user, profile?.credits_remaining ?? 10));
            }
          }
        } catch (error) {
          console.error('Auth state change error:', error);
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
      setUser(null);
      setProfileCreationAttempted(new Set()); // Reset on logout
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateCredits = (credits: number) => {
    if (user) {
      setUser({ ...user, credits });
    }
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
