import { AdminLogin } from '@/components/admin/AdminLogin';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';

export default function AdminPage() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <AdminLogin />;
}
