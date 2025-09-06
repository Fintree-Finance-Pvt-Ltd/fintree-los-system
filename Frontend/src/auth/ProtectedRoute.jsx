import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute({ children, need }) {
  const { user, loading } = useAuth();

  if (loading) return null; // simple splash; keep UI minimal
  if (!user) return <Navigate to="/login" replace />;
  if (need && !user.permissions?.includes(need)) return <Navigate to="/" replace />;

  return children;
}
