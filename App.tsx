
import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useAuth, AuthProvider } from './hooks/useAuth_new';
import { UserRole } from './types';
import { Header } from './components/Header';
import { useLanguage } from './hooks/useLanguage';
import Spinner from './components/Spinner';
import { supabase } from './services/supabaseClient';

// Lazy load components to improve initial loading time
const Login = lazy(() => import('./components/Login'));
const ManagerDashboard = lazy(() => import('./components/ManagerDashboard'));
const RepDashboard = lazy(() => import('./components/RepDashboard'));
const ResetPassword = lazy(() => import('./components/ResetPassword'));
const DbErrorScreen = lazy(() => import('./components/DbErrorScreen'));

// A wrapper for routes that require authentication
const ProtectedRoute = React.memo(({ children }: { children: React.ReactElement }) => {
  const { user, loading, authError } = useAuth();
  const location = useLocation();
  const { dir } = useLanguage();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#3a3358] flex items-center justify-center" dir={dir}>
        <Spinner />
      </div>
    );
  }

  if (authError) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#3a3358] flex items-center justify-center"><Spinner /></div>}>
        <DbErrorScreen error={authError} />
      </Suspense>
    );
  }

  return user ? children : <Navigate to="/login" state={{ from: location }} replace />;
});

// A wrapper for the login page to handle redirection if a user is already logged in
const PublicRoute = React.memo<{ children: React.ReactElement }>(({ children }) => {
   const { user, loading } = useAuth();
   if (loading) {
       return (
          <div className="min-h-screen bg-[#3a3358] flex items-center justify-center">
            <Spinner />
          </div>
       );
   }
   return user ? <Navigate to="/" replace /> : children;
});

// The main dashboard content, shown when a user is authenticated
const Dashboard = React.memo(() => {
  const { user } = useAuth(); // We know user is not null here due to ProtectedRoute
  const { dir } = useLanguage();
  
  if (!user) return null; // Should not happen, but for type safety

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-violet-100 to-amber-100 text-slate-800 animate-fade-in" dir={dir}>
      <Header />
      <main className="p-4 md:p-8">
        <Suspense fallback={<div className="flex items-center justify-center"><Spinner /></div>}>
          {user.role === UserRole.Manager || user.role === UserRole.Supervisor ? <ManagerDashboard /> : <RepDashboard />}
        </Suspense>
      </main>
    </div>
  );
});

// Component to manage routing logic and side-effects
const AppRoutes = React.memo(() => {
    const { dir } = useLanguage();
    const navigate = useNavigate();

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                // This event fires when the user clicks the password reset link.
                // We navigate them to the dedicated page to set a new password.
                navigate('/reset-password');
            }
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, [navigate]);

    return (
        <Routes>
            <Route 
                path="/login" 
                element={
                    <PublicRoute>
                        <div className="min-h-screen bg-[#3a3358] text-slate-100" dir={dir}>
                            <Suspense fallback={<div className="flex items-center justify-center h-full"><Spinner /></div>}>
                                <Login />
                            </Suspense>
                        </div>
                    </PublicRoute>
                } 
            />
            <Route 
                path="/reset-password" 
                element={
                    <div className="min-h-screen bg-[#3a3358] text-slate-100" dir={dir}>
                        <Suspense fallback={<div className="flex items-center justify-center h-full"><Spinner /></div>}>
                            <ResetPassword onSuccess={() => navigate('/login', { replace: true })} />
                        </Suspense>
                    </div>
                } 
            />
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />
            {/* Any other unknown path will redirect to the main page */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

// The main App component, now simplified to provide auth context directly
const App = React.memo(() => {
  return (
    <AuthProvider>
        <AppRoutes />
    </AuthProvider>
  );
};

export default App;
