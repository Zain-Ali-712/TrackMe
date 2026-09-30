import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import LoginPage from '@/pages/LoginPage';

// Each page is loaded on demand so the initial download stays small.
const DashboardLayout = lazy(() => import('@/pages/DashboardLayout'));
const DashboardHome = lazy(() => import('@/pages/DashboardHome'));
const LeadsPage = lazy(() => import('@/pages/LeadsPage'));
const AppointmentsPage = lazy(() => import('@/pages/AppointmentsPage'));
const HabitsPage = lazy(() => import('@/pages/HabitsPage'));
const LeadStatsPage = lazy(() => import('@/pages/LeadStatsPage'));

function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
      <div className="flex items-center gap-2.5 text-slate-400 dark:text-slate-500">
        <div className="h-4 w-4 rounded-full border-2 border-slate-300 dark:border-slate-700 border-t-slate-900 dark:border-t-slate-100 animate-spin" />
        <span className="text-xs font-semibold">Loading…</span>
      </div>
    </div>
  );
}

/** Gate the dashboard behind a valid session. */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isChecking } = useAuth();
  const location = useLocation();

  if (isChecking) return <FullPageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, isChecking } = useAuth();

  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        <Route
          path="/login"
          element={isChecking ? <FullPageSpinner /> : isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardLayout />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="lead-stats" element={<LeadStatsPage />} />
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="habits" element={<HabitsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;