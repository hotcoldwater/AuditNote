import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { AuthSplash } from './AuthSplash';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <AuthSplash
        title="감사노트"
        description="저장된 로그인 상태를 확인하고 학습 대시보드를 준비하는 중입니다."
      />
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
