import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuthStore } from '@/store/useAuthStore';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MarksEntry from './pages/MarksEntry';
import ClassView from './pages/ClassView';
import DepartmentView from './pages/DepartmentView';
import Reports from './pages/Reports';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, role, loading } = useAuthStore();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && role && !allowedRoles.includes(role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuthStore();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/marks-entry" element={<ProtectedRoute allowedRoles={['teacher', 'principal']}><MarksEntry /></ProtectedRoute>} />
      <Route path="/class-view" element={<ProtectedRoute allowedRoles={['coordinator', 'principal']}><ClassView /></ProtectedRoute>} />
      <Route path="/department-view" element={<ProtectedRoute allowedRoles={['hod', 'principal']}><DepartmentView /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute allowedRoles={['hod', 'principal']}><Reports /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => {
  const initialize = useAuthStore(s => s.initialize);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    initialize().then(fn => { unsub = fn; });
    return () => unsub?.();
  }, [initialize]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
