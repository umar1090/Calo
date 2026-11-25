import { lazy, Suspense } from 'react';
import { BrowserRouter, MemoryRouter, Navigate, Route, Routes } from 'react-router';
import { AuthProvider, useAuth } from '@/lib/auth/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';
import { AppShell } from '@/components/AppShell';
import { Logo } from '@/components/Logo';
import Welcome from '@/features/auth/Welcome';
import Onboarding from '@/features/onboarding/Onboarding';
import Dashboard from '@/features/dashboard/Dashboard';
import FoodLog from '@/features/log/FoodLog';
import { useDB } from '@/hooks/useAppData';

const Move = lazy(() => import('@/features/activity/Move'));
const Progress = lazy(() => import('@/features/progress/Progress'));
const Coach = lazy(() => import('@/features/assistant/Coach'));
const Profile = lazy(() => import('@/features/profile/ProfilePage'));

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center" aria-busy="true" aria-label="Loading NutriTrack">
      <div className="animate-pulse">
        <Logo />
      </div>
    </div>
  );
}

function PageFallback() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="h-8 w-48 animate-pulse rounded-full bg-cream-200" />
      <div className="h-48 animate-pulse rounded-3xl bg-cream-200" />
      <div className="h-32 animate-pulse rounded-3xl bg-cream-200" />
    </div>
  );
}

function SignedIn() {
  const db = useDB();
  if (!db.profile) {
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }
  return (
    <AppShell>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/log" element={<FoodLog />} />
          <Route path="/move" element={<Move />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/coach" element={<Coach />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

function Gate() {
  const { state } = useAuth();
  if (state.status === 'loading') return <Splash />;
  if (state.status === 'signed_out') {
    return (
      <Routes>
        <Route path="/welcome" element={<Welcome />} />
        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Routes>
    );
  }
  // Re-mount the signed-in tree when the user changes.
  return <SignedIn key={state.session.userId} />;
}

// The single-file preview build runs inside a host frame that doesn't allow path or "#/" URLs.
const Router = import.meta.env.MODE === 'artifact' ? MemoryRouter : BrowserRouter;

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <Gate />
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}
