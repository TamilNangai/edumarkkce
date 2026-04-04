import { useEffect } from 'react';
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
import AdminApproval from './pages/AdminApproval';
import CoordinatorDashboard from './pages/CoordinatorDashboard';
import HodDashboard from './pages/HodDashboard';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, role, loading, profile } = useAuthStore();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (profile?.status !== 'active') return <Navigate to="/login" replace />;
  if (allowedRoles && role && !allowedRoles.includes(role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RoleBasedHome() {
  const { role } = useAuthStore();
  switch (role) {
    case 'principal': return <Dashboard />;
    case 'coordinator': return <CoordinatorDashboard />;
    case 'hod': return <HodDashboard />;
    case 'teacher': return <MarksEntry />;
    default: return <Dashboard />;
  }
}

function AppRoutes() {
  const { user, loading, profile } = useAuthStore();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <Routes>
      <Route path="/login" element={user && profile?.status === 'active' ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><RoleBasedHome /></ProtectedRoute>} />
      <Route path="/marks-entry" element={<ProtectedRoute allowedRoles={['teacher', 'principal']}><MarksEntry /></ProtectedRoute>} />
      <Route path="/class-view" element={<ProtectedRoute allowedRoles={['coordinator', 'principal']}><ClassView /></ProtectedRoute>} />
      <Route path="/coordinator-dashboard" element={<ProtectedRoute allowedRoles={['coordinator', 'principal']}><CoordinatorDashboard /></ProtectedRoute>} />
      <Route path="/hod-dashboard" element={<ProtectedRoute allowedRoles={['hod', 'principal']}><HodDashboard /></ProtectedRoute>} />
      <Route path="/department-view" element={<ProtectedRoute allowedRoles={['hod', 'principal']}><DepartmentView /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute allowedRoles={['hod', 'principal']}><Reports /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['principal']}><AdminApproval /></ProtectedRoute>} />
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
