import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SiteLayout } from '@/components/layout/SiteLayout';
import { Button } from '@/components/ui/button';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import {
  User, Package, Heart, Ruler, LogOut, Edit, Loader2
} from 'lucide-react';
import { showSuccess, showError, showLoading } from '@/lib/toastHelpers';
import { apiClient } from '@/lib/apiClient';
import { ApiError } from '@/lib/apiClient';
import { getCustomerProfileFolder } from '@/lib/cloudinaryFolders';
import { getAvatarUrl } from '@/utils/imageHelper';

// Import Tab Components
import { AccountOrdersTab } from '@/components/account/AccountOrdersTab';
import { AccountDesignsTab } from '@/components/account/AccountDesignsTab';
import { AccountMeasurementsTab } from '@/components/account/AccountMeasurementsTab';
import { AccountProfileTab } from '@/components/account/AccountProfileTab';

type TabType = 'orders' | 'designs' | 'measurements' | 'profile';

export default function AccountPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    customer,
    isAuthenticated,
    isLoading,
    orders,
    logout,
    fetchOrders,
    fetchProfile,
    updateProfile,
    deleteDesign,
    deleteMeasurements,
  } = useCustomerAuth();

  // Read initial tab from URL
  const urlTab = searchParams.get('tab') as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(urlTab || 'orders');

  // Update tab from URL params
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as TabType | null;
    if (tabFromUrl && ['orders', 'designs', 'measurements', 'profile'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/account' } } });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Fetch data on mount only
  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
      fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    showSuccess('Logged out successfully');
    navigate('/');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const dismissToast = showLoading('Uploading profile image...');
    const formData = new FormData();
    // Per-customer profile folder: customers/{id}/profile
    const profileFolder = getCustomerProfileFolder(customer?._id || '', customer?.name);
    formData.append('folder', profileFolder);

    // Using a static name forces Cloudinary to overwrite the existing file, permanently eliminating orphan file bloat
    formData.append('custom_public_id', 'profile');

    // IMPORTANT: Append file AFTER text boundaries so Multer parses correctly
    formData.append('image', file);

    try {
      const data = await apiClient.upload<{ path: string }>('/upload', formData);

      if (data.path) {
        await updateProfile({ profileImage: data.path });
        dismissToast();
        showSuccess('Profile image updated');
        fetchProfile();
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Upload error:', error);
      dismissToast();
      const apiError = error as ApiError;
      showError(apiError.message || 'Failed to upload image. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="container mx-auto px-4 lg:px-8 py-20 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
        </div>
      </SiteLayout>
    );
  }

  if (!customer) return null;

  const tabs = [
    { id: 'orders', label: 'My Orders', icon: Package, count: orders.length },
    { id: 'designs', label: 'Saved Designs', icon: Heart, count: customer.savedDesigns?.length || 0 },
    { id: 'measurements', label: 'Measurements', icon: Ruler, count: customer.savedMeasurements?.length || 0 },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 lg:px-8 py-12 animate-fade-up overflow-x-hidden">
        <div className="max-w-6xl mx-auto min-w-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex items-center gap-6">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-white shadow-lg shrink-0">
                  <img src={getAvatarUrl(customer.profileImage)} alt="" className="w-full h-full object-cover" />
                </div>
                {/* Image Upload Overlay */}
                <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <Edit className="w-6 h-6 text-white" />
                </label>
              </div>
              <div>
                <h1 className="font-display text-3xl lg:text-4xl font-semibold text-foreground">
                  Welcome, {customer.name?.split(' ')[0]}
                </h1>
                <p className="text-muted-foreground">{customer.email}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout} className="rounded-xl">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>

          <div className="grid lg:grid-cols-[240px_1fr] gap-8 min-w-0">
            {/* Sidebar */}
            <nav className="space-y-2 shrink-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeTab === tab.id
                    ? 'bg-primary text-white shadow-md'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <tab.icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </div>
                  {tab.count !== undefined && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20' : 'bg-muted'
                      }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            {/* Content */}
            <div className="bg-white rounded-2xl border border-border/50 shadow-soft p-6 lg:p-8 min-w-0 overflow-hidden">
              {activeTab === 'orders' && (
                <AccountOrdersTab orders={orders} onRefresh={fetchOrders} />
              )}

              {activeTab === 'designs' && (
                <AccountDesignsTab
                  designs={customer.savedDesigns || []}
                  onDelete={deleteDesign}
                />
              )}

              {activeTab === 'measurements' && (
                <AccountMeasurementsTab
                  measurements={customer.savedMeasurements || []}
                  onDelete={deleteMeasurements}
                />
              )}

              {activeTab === 'profile' && (
                <AccountProfileTab
                  customer={customer}
                  onUpdate={updateProfile}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
