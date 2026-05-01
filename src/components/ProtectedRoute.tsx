import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { AuthSplash } from './AuthSplash';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AuthSplash title="감사노트" />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function AdminRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthSplash title="감사노트" />;
  }

  if (!user?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
