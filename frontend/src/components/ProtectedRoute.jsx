import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { Spinner } from './ui.jsx';

export default function ProtectedRoute({ children, minRole }) {
  const { user, loading, can } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (minRole && !can(minRole))
    return <div className="p-8 text-rose-500">Acesso negado para o seu perfil.</div>;
  return children;
}
