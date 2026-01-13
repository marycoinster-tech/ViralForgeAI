import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Load theme on mount and when user changes
  useEffect(() => {
    const loadTheme = async () => {
      if (!user) {
        // Not logged in, use default dark theme
        applyTheme('dark');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('theme')
          .eq('id', user.id)
          .single();

        if (!error && data?.theme) {
          const userTheme = data.theme as Theme;
          setThemeState(userTheme);
          applyTheme(userTheme);
        } else {
          applyTheme('dark');
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
        applyTheme('dark');
      } finally {
        setLoading(false);
      }
    };

    loadTheme();
  }, [user?.id]);

  const applyTheme = (newTheme: Theme) => {
    if (newTheme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    }
  };

  const setTheme = async (newTheme: Theme) => {
    if (!user) {
      // Just apply locally if not logged in
      setThemeState(newTheme);
      applyTheme(newTheme);
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ theme: newTheme })
        .eq('id', user.id);

      if (error) throw error;

      setThemeState(newTheme);
      applyTheme(newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
      throw error;
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, loading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
