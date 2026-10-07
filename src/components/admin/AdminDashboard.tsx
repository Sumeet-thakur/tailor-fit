import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatPrice } from '@/lib/formatPrice';
import { adminService } from '@/services/admin';
import { productService } from '@/services/products';
import { orderService } from '@/services/orders';
import { adminAuthService } from '@/services/auth';
import { apiClient } from '@/lib/apiClient';
import { ApiError } from '@/lib/apiClient';
import {
  Scissors, LogOut, Square, PanelTop, Disc, ArrowLeftRight, LayoutDashboard,
  Menu, X, Home, Package, ChevronRight, Search, ShoppingCart, Eye, Clock, CheckCircle2, Truck, ShoppingBag, Calendar, MapPin, ArrowRight, Key,
  Users, Shield, KeyRound, UserCog, Ban, CheckCircle, Mail, Phone, Sparkles, Palette, FileText, User, EyeOff, CreditCard, MessageCircle, HelpCircle, Bot
} from 'lucide-react';
import { showSuccess, showError, showInfo, showLoading, showWarning } from '@/lib/toastHelpers';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { FabricOption, CustomizationOption } from '@/types/shirt';
import { Product } from '@/types/product';
import type { Fabric3D, FabricCategory } from '@/types/fabric';
import { FABRIC_CATEGORIES } from '@/types/fabric';
import { Box } from 'lucide-react';
import { Order } from '@/types/order';
// Lazy load admin tabs to reduce initial bundle size
const AdminOrdersTab = React.lazy(() => import('@/components/admin/AdminOrdersTab').then(m => ({ default: m.AdminOrdersTab })));
const AdminPaymentsTab = React.lazy(() => import('@/components/admin/AdminPaymentsTab').then(m => ({ default: m.AdminPaymentsTab })));
const AdminChatTab = React.lazy(() => import('@/components/admin/AdminChatTab').then(m => ({ default: m.AdminChatTab })));
const AdminSupportChat = React.lazy(() => import('@/components/admin/AdminSupportChat').then(m => ({ default: m.AdminSupportChat })));
const AdminQueriesTab = React.lazy(() => import('@/components/admin/AdminQueriesTab').then(m => ({ default: m.AdminQueriesTab })));
const AdminChatAnalyticsTab = React.lazy(() => import('@/components/admin/AdminChatAnalyticsTab').then(m => ({ default: m.AdminChatAnalyticsTab })));
const AdminSettingsTab = React.lazy(() => import('@/components/admin/AdminSettingsTab').then(m => ({ default: m.AdminSettingsTab })));
const AdminAdminsTab = React.lazy(() => import('@/components/admin/AdminAdminsTab').then(m => ({ default: m.AdminAdminsTab })));
const AdminCustomersTab = React.lazy(() => import('@/components/admin/AdminCustomersTab').then(m => ({ default: m.AdminCustomersTab })));
const AdminProductsTab = React.lazy(() => import('@/components/admin/AdminProductsTab').then(m => ({ default: m.AdminProductsTab })));
const AdminGenericItemsTab = React.lazy(() => import('@/components/admin/AdminGenericItemsTab').then(m => ({ default: m.AdminGenericItemsTab })));
import { adminChatService } from '@/services/chat';
import { superAdminSupportService } from '@/services/adminSupport';
import { connectChatSocket, disconnectChatSocket, onChatMessage } from '@/lib/chatSocket';
import { onAdminSupportMessage } from '@/lib/adminSupportSocket';
import { getFabricThumbnailUrl } from '@/services/fabricService';
import { getImageUrl } from '@/utils/imageHelper';
import { getOrderStatusInfo, ORDER_STATUS_OPTIONS } from '@/lib/orderStatusUtils';
import { getPaymentStatusInfo } from '@/lib/paymentConstants';
import { PaymentStatusBadge, TransactionIdDisplay, AdminPaymentActions } from '@/components/common/PaymentStatusBadge';

interface CustomerData {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: { street?: string; city?: string; state?: string; postalCode?: string; country?: string };
  profileImage?: string;
  savedDesigns?: any[];
  savedMeasurements?: any[];
  orderCount?: number;
  createdAt?: string;
}

interface AdminData {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'super_admin';
  isActive: boolean;
  profileImage?: string;
  lastLogin?: string;
  createdAt?: string;
}

import { AdminNotificationPanel } from '@/components/admin/AdminNotificationPanel';

export function AdminDashboard() {
  const { logout, admin, token, isSuperAdmin, updateAdmin } = useAuth();
  const { isAuthenticated: isCustomerAuthenticated } = useCustomerAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'orders';

  // Safety Effect: Unlock body scroll/clicks on mount in case of stuck overrides
  useEffect(() => {
    // Force close sidebar on desktop/mount
    setIsSidebarOpen(false);

    // Clear any stuck styles from Radix/Dialogs
    const cleanup = setTimeout(() => {
      document.body.style.pointerEvents = '';
      document.body.style.overflow = '';
    }, 100);

    return () => clearTimeout(cleanup);
  }, []);

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
    // Clear relevant badge when opening a tab
    if (tab === 'chat') setChatUnreadCount(0);
    if (tab === 'admin-queries') setAdminQueriesUnreadCount(0);
    if (tab === 'support') setSupportUnreadCount(0);
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);

  // Customer management state
  const [admins, setAdmins] = useState<AdminData[]>([]); // Added admins state
  // Badge counts — lightweight, no full data fetch needed
  const [productsCount, setProductsCount] = useState(0);
  const [customersCount, setCustomersCount] = useState(0);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [customerStats, setCustomerStats] = useState({
    total: 0,
    delivered: 0,
    cancelled: 0,
    active: 0,
    totalSpent: 0
  });

  // Invite code visibility state
  const [showInviteCode, setShowInviteCode] = useState(false);

  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [adminQueriesUnreadCount, setAdminQueriesUnreadCount] = useState(0);
  const [supportUnreadCount, setSupportUnreadCount] = useState(0);

  const handleLogout = () => {
    logout();
    navigate('/');
    showSuccess('Logged out successfully');
  };



  const fetchChatUnreadCount = useCallback(async () => {
    if (!token || token === 'legacy-token') return;
    try {
      const n = await adminChatService.getUnreadTotal(token);
      setChatUnreadCount(n);
    } catch {
      setChatUnreadCount(0);
    }
  }, [token]);

  const fetchAdminQueriesUnreadCount = useCallback(async () => {
    if (!token || token === 'legacy-token' || !isSuperAdmin) return;
    try {
      const n = await superAdminSupportService.getUnreadTotal(token);
      setAdminQueriesUnreadCount(n);
    } catch {
      setAdminQueriesUnreadCount(0);
    }
  }, [token, isSuperAdmin]);

  // Lightweight count fetches for sidebar badges (no full data)
  const fetchProductsCount = useCallback(async () => {
    try {
      const data = await productService.getAll();
      setProductsCount(data?.length || 0);
    } catch { /* badge will show 0 */ }
  }, []);

  const fetchCustomersCount = useCallback(async () => {
    if (!token || token === 'legacy-token') return;
    try {
      const data = await adminService.getCustomers(token);
      setCustomersCount(data?.length || 0);
    } catch { /* badge will show 0 */ }
  }, [token]);

  const fetchAdmins = useCallback(async () => {
    if (!token || token === 'legacy-token' || !isSuperAdmin) return;
    try {
      const data = await adminService.getAdmins(token);
      setAdmins(data || []);
    } catch (err) {
      console.error("Failed to fetch admins for badge", err);
    }
  }, [token, isSuperAdmin]);


  // Socket.io: connect when admin logged in, live-increment badges on socket events
  useEffect(() => {
    if (!token || token === 'legacy-token') {
      disconnectChatSocket();
      return;
    }
    connectChatSocket(token);
    fetchChatUnreadCount();
    // Lightweight count fetches for sidebar badges only
    fetchProductsCount();
    fetchCustomersCount();
    if (isSuperAdmin) {
      fetchAdminQueriesUnreadCount();
      fetchAdmins(); // Fetch on mount
    }

    // Live increment chat badge when customer sends a message (skip when admin is viewing chat tab)
    const unsubChat = onChatMessage((msg) => {
      if (msg.senderModel === 'Customer') {
        setChatUnreadCount(prev => prev + 1);
      }
    });

    // Live increment admin support / admin queries badges
    const unsubSupport = isSuperAdmin
      ? onAdminSupportMessage((msg) => {
        if (msg.senderModel === 'Admin') {
          setAdminQueriesUnreadCount(prev => prev + 1);
        }
      })
      : onAdminSupportMessage((msg) => {
        if (msg.senderModel === 'SuperAdmin') {
          setSupportUnreadCount(prev => prev + 1);
        }
      });

    return () => {
      unsubChat();
      unsubSupport();
      disconnectChatSocket();
    };
  }, [token, isSuperAdmin, fetchChatUnreadCount, fetchAdminQueriesUnreadCount, fetchCustomersCount, fetchAdmins, fetchProductsCount]);

  // Polling: refresh badge counts every 60 seconds so they stay current
  useEffect(() => {
    if (!token || token === 'legacy-token') return;
    const interval = setInterval(() => {
      fetchProductsCount();
      fetchCustomersCount();
      fetchChatUnreadCount();
      if (isSuperAdmin) {
        fetchAdmins();
        fetchAdminQueriesUnreadCount();
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [token, isSuperAdmin, fetchChatUnreadCount, fetchAdminQueriesUnreadCount, fetchCustomersCount, fetchAdmins, fetchProductsCount]);

  const productCategories = [
    { id: 'shirt', label: 'Dress Shirts' },
    { id: 'suit', label: 'Suits' },
    { id: 'pants', label: 'Dress Pants' },
    { id: 'blazer', label: 'Blazers' },
    { id: 'vest', label: 'Vests' },
    { id: 'tuxedo', label: 'Tuxedos' },
  ];

  const allCategories = [
    { id: 'orders', label: 'Orders', icon: ShoppingCart, items: orders },
    { id: 'payments', label: 'Payments & Promos', icon: CreditCard, items: [] },
    { id: 'chat', label: 'Customer Support', icon: MessageCircle, items: [] },
    { id: 'products', label: 'Products', icon: Package, items: [] as any[] },
    { id: 'customers', label: 'Customers', icon: Users, items: [] as any[] },
    { id: 'settings', label: 'Settings', icon: UserCog, items: [] },
    ...(isSuperAdmin ? [{ id: 'admins', label: 'Admins', icon: Shield, items: admins }] : []),
    ...(isSuperAdmin ? [{ id: 'admin-queries', label: 'Admin Queries', icon: HelpCircle, items: [] }] : []),
    ...(isSuperAdmin ? [{ id: 'ai-analytics', label: 'Chat Analytics', icon: Bot, items: [] }] : []),
    ...(!isSuperAdmin ? [{ id: 'support', label: 'Support', icon: HelpCircle, items: [] }] : []),
  ];

  // Organize menu items: group1=Customers etc, group2=Customer Support + Admin Queries, group3=Products & Orders & Payments, group4=Chat Analytics + Settings
  const getGroupedCategories = () => {
    const byId = (id: string) => allCategories.find(c => c.id === id);
    if (isSuperAdmin) {
      return {
        group1: [byId('customers'), byId('admins')].filter(Boolean) as typeof allCategories,
        group2: [byId('chat'), byId('admin-queries')].filter(Boolean) as typeof allCategories,
        group3: [byId('orders'), byId('payments'), byId('products')].filter(Boolean) as typeof allCategories,
        group4: [byId('ai-analytics'), byId('settings')].filter(Boolean) as typeof allCategories,
      };
    } else {
      return {
        group1: [byId('customers'), byId('chat'), byId('orders'), byId('payments'), byId('support')].filter(Boolean) as typeof allCategories,
        group2: [byId('products')].filter(Boolean) as typeof allCategories,
        group3: [byId('settings')].filter(Boolean) as typeof allCategories,
        group4: [] as typeof allCategories,
      };
    }
  };

  const categories = allCategories; // Backwards compatible









  useEffect(() => {
    // Check for welcome query param embedded by Auth page
    const params = new URLSearchParams(window.location.search);
    if (params.get('welcome') === 'true') {
      showSuccess(`Welcome back ${admin.name}`);
      // Clean up the URL without reloading
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

  }, [token, isSuperAdmin]);

  useEffect(() => {
    if (activeTab === 'orders') fetchOrders();
    // Products and customers data is fetched internally by their own tab components
    if (activeTab === 'chat') fetchChatUnreadCount();
    if (activeTab === 'admins') fetchAdmins();
    if (activeTab === 'admin-queries') fetchAdminQueriesUnreadCount();
  }, [activeTab, token, isSuperAdmin, fetchAdminQueriesUnreadCount, fetchChatUnreadCount, fetchAdmins]);

  const fetchOrders = async () => {
    setOrdersLoading(true);
    setOrdersError('');
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error('Failed to load orders');
      const data = await res.json();
      setOrders(data.data || []);
    } catch (err) {
      const error = err as Error;
      setOrdersError(error.message || 'Failed to load orders');
    } finally {
      setOrdersLoading(false);
    }
  };


  const updateOrderStatus = async (orderId: string, status: string) => {
    if (!token || token === 'legacy-token') return;
    try {
      await orderService.updateStatus(orderId, status, token);
      showSuccess('Order status updated');
      fetchOrders();
      setIsOrderDialogOpen(false);
    } catch (err) {
      const error = err as Error;
      showError(error.message || 'Failed to update status');
    }
  };

  const updatePaymentDetails = async (orderId: string, updates: Partial<Order['paymentDetails']>) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success) {
        showSuccess('Payment details updated');

        // Optimistically update the orders list to avoid full reload
        setOrders(prevOrders =>
          prevOrders.map(o =>
            o._id === orderId ? { ...o, ...updates } : o
          )
        );

        // Update local state if selected order matches
        if (selectedOrder?._id === orderId) {
          setSelectedOrder((prev) => prev ? { ...prev, ...updates } : null);
        }

      } else {
        showError(data.message);
      }
    } catch (error) {
      showError('Failed to update payment details');
    }
  };


  const getStatusBadgeClasses = (status: string) => {
    const info = getOrderStatusInfo(status);
    return `${info.bgColor} ${info.color}`;
  };

  const orderStatuses = [...ORDER_STATUS_OPTIONS];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-primary px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">

          {/* <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-accent/30 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500">
              </div>
              <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-accent shadow-glow transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-scissors h-5 w-5 text-primary transition-transform duration-300 group-hover:rotate-45">
                  <circle cx="6" cy="6" r="3"></circle>
                  <path d="M8.12 8.12 12 12"></path>
                  <path d="M20 4 8.12 15.88"></path>
                  <circle cx="6" cy="18" r="3"></circle>
                  <path d="M14.8 14.8 20 20"></path>
                </svg>
              </div>
            </div>
            <div className="flex flex-col">
              <h1 className="font-display text-xl font-bold text-white">Tailor Fit</h1>
              <p className="text-[11px] font-medium text-white/60">Bespoke Tailoring</p>
            </div>
          </div> */}

          <a className="flex items-center gap-3 group z-10" href="/">
            <div className="relative">
              <div className="absolute inset-0 bg-accent/30 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
              <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-accent shadow-glow transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-scissors h-5 w-5 text-primary transition-transform duration-300 group-hover:rotate-45">
                  <circle cx="6" cy="6" r="3"></circle>
                  <path d="M8.12 8.12 12 12"></path>
                  <path d="M20 4 8.12 15.88"></path>
                  <circle cx="6" cy="18" r="3"></circle>
                  <path d="M14.8 14.8 20 20"></path>
                </svg>
              </div>
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display text-xl font-bold text-white">Tailor Fit</h1>
              <p className="text-[11px] font-medium text-white/60">Bespoke Tailoring</p>
            </div>
          </a>



        </div>
        <div className="flex items-center gap-3">
          <AdminNotificationPanel onNavigateTab={setActiveTab} />
          <button onClick={() => setActiveTab('products')} className={`relative p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all duration-300 ${activeTab === 'products' ? 'bg-white/20 ring-1 ring-white' : ''}`}>
            <Package className="w-5 h-5" />
          </button>
          <button onClick={() => setActiveTab('orders')} className={`relative p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all duration-300 ${activeTab === 'orders' ? 'bg-white/20 ring-1 ring-white' : ''}`}>
            <ShoppingCart className="w-5 h-5" />
          </button>


          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all duration-300"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 w-72 h-screen bg-primary text-primary-foreground transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex flex-col shadow-2xl border-r border-white/10`}>
        {/* Sidebar Header / Logo */}
        <div className="h-24 flex items-center px-6 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => navigate('/')}>
            <div className="relative">
              <div className="absolute inset-0 bg-accent/30 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500" />
              <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-accent shadow-glow transition-all duration-300 group-hover:scale-105">
                <Scissors className="h-5 w-5 text-primary transition-transform duration-300 group-hover:rotate-45" />
              </div>
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-white tracking-tight">Tailor Fit</h1>
              <p className="text-[11px] font-medium text-white/60 tracking-wider uppercase">Bespoke Tailoring</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {(() => {
            const groups = getGroupedCategories();
            return (
              <>
                {/* Badge Logic Helper */}
                {(() => {
                  const getBadgeConfig = (catId: string, isActive: boolean) => {
                    // Default: bg-accent text-primary (User's choice)
                    // Active: bg-primary text-accent (User's request)
                    const colorClass = isActive
                      ? "bg-red-500 text-white"
                      : "bg-red-500 text-white";

                    const baseClass = `px-2 py-0.5 rounded-full text-[11px] font-bold shadow-sm ${colorClass} min-w-[20px] text-center flex items-center justify-center transition-colors duration-200`;

                    switch (catId) {
                      case 'orders':
                        return { count: orders.length, show: true, className: baseClass };
                      case 'products':
                        return { count: productsCount, show: true, className: baseClass };
                      case 'customers':
                        return { count: customersCount, show: true, className: baseClass };
                      case 'admins':
                        return { count: admins.length, show: true, className: baseClass };
                      case 'chat':
                        return { count: chatUnreadCount, show: chatUnreadCount > 0, className: baseClass };
                      case 'admin-queries':
                        return { count: adminQueriesUnreadCount, show: adminQueriesUnreadCount > 0, className: baseClass };
                      case 'support':
                        return { count: supportUnreadCount, show: supportUnreadCount > 0, className: baseClass };
                      default:
                        return { count: 0, show: false, className: '' };
                    }
                  };

                  const renderCategoryButton = (cat: typeof groups.group1[0]) => { // Using typeof groups.group1[0] as a more specific type
                    const isActive = activeTab === cat.id;
                    const badge = getBadgeConfig(cat.id, isActive);

                    return (
                      <button
                        key={cat.id}
                        onClick={() => { setActiveTab(cat.id); setIsSidebarOpen(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${isActive
                          ? 'bg-accent text-primary shadow-lg shadow-black/5'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          {cat.icon && <cat.icon className="w-5 h-5" />}
                          <span>{cat.label}</span>
                        </div>
                        {badge.show && (
                          <span className={badge.className}>
                            {badge.count}
                          </span>
                        )}
                      </button>
                    );
                  };

                  return (
                    <>
                      {/* Group 1: Main Management */}
                      <div className="space-y-1">
                        <p className="px-2 text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Management</p>
                        {groups.group1.map(renderCategoryButton)}
                      </div>

                      {/* Group 2: Catalog/Support */}
                      {groups.group2.length > 0 && (
                        <div className="space-y-1">
                          <p className="px-2 text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Catalog & Support</p>
                          {groups.group2.map(renderCategoryButton)}
                        </div>
                      )}

                      {/* Group 3: Settings/System */}
                      {(groups.group3.length > 0 || groups.group4.length > 0) && (
                        <div className="space-y-1">
                          <p className="px-2 text-xs font-medium text-white/40 uppercase tracking-wider mb-2">System</p>
                          {[...groups.group3, ...groups.group4].map(renderCategoryButton)}
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 space-y-2">
          {/* Admin Info */}
          {admin && (
            <div className="mb-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                {admin.profileImage ? (
                  <img
                    src={admin.profileImage}
                    alt={admin.name}
                    className="w-9 h-9 rounded-lg object-cover bg-white/5"
                  />
                ) : (
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isSuperAdmin ? 'bg-amber-500/20' : 'bg-accent/20'}`}>
                    <Shield className={`w-4 h-4 ${isSuperAdmin ? 'text-amber-400' : 'text-accent'}`} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{admin.name}</p>
                  <p className="text-xs text-white/50 truncate">{admin.email}</p>
                </div>
              </div>
              {isSuperAdmin && (
                <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400">
                  Super Admin
                </span>
              )}
            </div>
          )}
          <Link to="/" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all">
            <Home className="w-5 h-5" />
            View Site
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-300 hover:bg-red-500/10 hover:text-red-200 transition-all">
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside >

      {/* Main Content */}
      < main className="lg:ml-72 min-h-screen pt-[72px] lg:pt-0" >
        {/* Top Header Bar */}
        < div className="bg-white border-b border-border/50 px-6 lg:px-10 py-6" >
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <span>Dashboard</span>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground font-medium">{categories.find(c => c.id === activeTab)?.label}</span>
              </div>
              <h1 className="font-display text-3xl lg:text-4xl font-semibold text-foreground">
                Manage {categories.find(c => c.id === activeTab)?.label}
              </h1>
              <p className="text-muted-foreground mt-1">
                {activeTab === 'products' ? 'Create and manage your product catalog' : activeTab === 'ai-analytics' ? 'View AI usage, token stats, and add custom analytics descriptions' : `Add, edit, or remove ${activeTab} options`}
              </p>
            </div>

            {/* Hide search/add for settings and chat tabs */}
            {activeTab !== 'settings' && activeTab !== 'chat' && activeTab !== 'support' && activeTab !== 'admin-queries' && activeTab !== 'ai-analytics' && (
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                {/* Search */}
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-12 w-full sm:w-64 pl-11 pr-4 rounded-xl bg-muted/50 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                {/* Add Button */}
                {activeTab === 'orders' && (
                  <Button onClick={fetchOrders} className="h-12 px-6 rounded-xl bg-gradient-luxury text-white shadow-soft hover:shadow-elevated transition-all">
                    Refresh Orders
                  </Button>
                )}
              </div>
            )}
          </div>
        </div >

        {/* Content Area */}
        < div key={activeTab} className="p-6 lg:p-10 max-w-7xl mx-auto min-h-[50vh]" >
          <React.Suspense fallback={
            <div className="flex items-center justify-center p-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          }>
            <div className="transition-all duration-500 animate-fade-up motion-reduce:animate-none">
              {
                activeTab === 'chat' ? (
                  <AdminChatTab onConversationViewed={fetchChatUnreadCount} />
                ) : activeTab === 'ai-analytics' ? (
                  <AdminChatAnalyticsTab />
                ) : activeTab === 'support' ? (
                  <AdminSupportChat />
                ) : activeTab === 'admin-queries' ? (
                  <AdminQueriesTab onConversationViewed={fetchAdminQueriesUnreadCount} />
                ) : activeTab === 'orders' ? (
                  <AdminOrdersTab
                    orders={orders}
                    ordersLoading={ordersLoading}
                    ordersError={ordersError}
                    searchTerm={searchTerm}
                    selectedOrder={selectedOrder}
                    isOrderDialogOpen={isOrderDialogOpen}
                    fetchOrders={fetchOrders}
                    setSelectedOrder={setSelectedOrder}
                    setIsOrderDialogOpen={setIsOrderDialogOpen}
                    updateOrderStatus={updateOrderStatus}
                    updatePaymentDetails={updatePaymentDetails}
                  />
                ) : activeTab === 'payments' ? (
                  <AdminPaymentsTab />
                ) : activeTab === 'customers' ? (
                  <AdminCustomersTab searchTerm={searchTerm} />
                ) : activeTab === 'admins' ? (
                  <AdminAdminsTab searchTerm={searchTerm} />
                ) : activeTab === 'products' ? (
                  <AdminProductsTab searchTerm={searchTerm} onProductsChange={fetchProductsCount} />
                ) : activeTab === 'settings' ? (
                  <AdminSettingsTab />
                ) : (
                  <AdminGenericItemsTab activeTab={activeTab} searchTerm={searchTerm} />
                )
              }
            </div>
          </React.Suspense>
        </div >
      </main >
    </div >
  );
}
