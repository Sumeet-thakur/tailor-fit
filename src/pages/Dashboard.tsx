import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AdminNotificationProvider } from '@/context/AdminNotificationContext';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';

export default function DashboardPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AdminNotificationProvider>
      <AdminDashboard />
    </AdminNotificationProvider>
  );
}
