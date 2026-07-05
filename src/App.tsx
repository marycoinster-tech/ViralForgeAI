import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CreditsProvider } from '@/contexts/CreditsContext';
import { Toaster } from '@/components/ui/toaster';
import { Login } from '@/pages/Login';
import { Signup } from '@/pages/Signup';
import { Chat } from '@/pages/Chat';
import { Home } from '@/pages/Home';
import { Settings } from '@/pages/Settings';
import { HookBattle } from '@/pages/HookBattle';
import { ViralDNA } from '@/pages/ViralDNA';
import { Calendar } from '@/pages/Calendar';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-10 w-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <div className="absolute inset-0 rounded-full blur-md bg-primary/20 animate-pulse" />
          </div>
          <span className="text-xs text-muted-foreground font-semibold tracking-widest uppercase">Loading</span>
        </div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  return user ? <Navigate to="/app" /> : <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route
        path="/app/*"
        element={
          <PrivateRoute>
            <Routes>
              <Route path="/" element={<Chat />} />
              <Route path="/:conversationId" element={<Chat />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/hook-battle" element={<HookBattle />} />
              <Route path="/viral-dna" element={<ViralDNA />} />
              <Route path="/calendar" element={<Calendar />} />
            </Routes>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <CreditsProvider>
            <AppRoutes />
            <Toaster />
          </CreditsProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
