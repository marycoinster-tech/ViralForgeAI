import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Toaster } from '@/components/ui/toaster';
import { Login } from '@/pages/Login';
import { Signup } from '@/pages/Signup';
import { Chat } from '@/pages/Chat';
import { Home } from '@/pages/Home';
import { Settings } from '@/pages/Settings';
import { HookBattle } from '@/pages/HookBattle';
import { ViralDNA } from '@/pages/ViralDNA';
import { Calendar } from '@/pages/Calendar';
import { Insights } from '@/pages/Insights';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
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
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        }
      />
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
              <Route path="/insights" element={<Insights />} />
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
          <AppRoutes />
          <Toaster />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
