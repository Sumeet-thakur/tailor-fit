import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { customerService } from '@/services/customers';
import { ApiError } from '@/lib/apiClient';

interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

interface SavedMeasurement {
  _id: string;
  label: string;
  chest?: number;
  waist?: number;
  hips?: number;
  shoulders?: number;
  sleeveLength?: number;
  shirtLength?: number;
  neck?: number;
  inseam?: number;
  thigh?: number;
  isDefault?: boolean;
  createdAt: string;
}

interface SavedDesign {
  _id: string;
  name?: string; // User-defined name for the design
  productId: string;
  productName: string;
  productCategory: string;
  baseImage: string;
  screenshot?: string;
  fabric: { id: string; name: string; image: string } | null;
  styles: Record<string, any>;
  measurements: Record<string, any>;
  totalPrice: number;
  savedAt: string;
}

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: Address;
  savedMeasurements?: SavedMeasurement[];
  savedDesigns?: SavedDesign[];
  orderCount?: number;
  profileImage?: string;
  createdAt?: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  items: any[];
  total: number;
  status: string;
  createdAt: string;
  paymentMethod?: string;
  paymentStatus?: string;
  transactionId?: string;
  paymentGateway?: string;
}

interface CustomerAuthContextType {
  customer: Customer | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  orders: Order[];
  login: (email: string, password: string) => Promise<{ success: boolean; message: string; name?: string }>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  updateProfile: (data: Partial<Customer>) => Promise<{ success: boolean; message: string }>;
  fetchOrders: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  saveDesign: (design: Omit<SavedDesign, '_id' | 'savedAt'>) => Promise<{ success: boolean; message: string }>;
  deleteDesign: (id: string) => Promise<{ success: boolean; message: string }>;
  saveMeasurements: (data: Omit<SavedMeasurement, '_id' | 'createdAt'>) => Promise<{ success: boolean; message: string }>;
  deleteMeasurements: (id: string) => Promise<{ success: boolean; message: string }>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

import { getCustomerAuth, saveCustomerAuth, removeCustomerAuth, type CustomerAuthData } from '@/lib/authStorage';

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);

  // Load saved auth on mount and verify the token is still valid
  useEffect(() => {
    const savedData = getCustomerAuth();
    if (savedData && savedData.customer && savedData.token) {
      setCustomer(savedData.customer);
      setToken(savedData.token);

      // Verify token is still valid in the background
      customerService.getMe(savedData.token).catch((err: any) => {
        if (err?.status === 401) {
          // Token expired — auto-logout silently
          removeCustomerAuth();
          setCustomer(null);
          setToken(null);
        }
      });
    }
    setIsLoading(false);
  }, []);

  // Save auth to localStorage
  const saveAuth = (customer: Customer, token: string) => {
    saveCustomerAuth({ customer, token });
    setCustomer(customer);
    setToken(token);
  };

  // Clear auth
  const clearAuth = () => {
    removeCustomerAuth();
    setCustomer(null);
    setToken(null);
    setOrders([]);
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; message: string; name?: string }> => {
    try {
      const data = await customerService.login(email, password);
      saveAuth(data, data.token);
      return { success: true, message: 'Login successful', name: data.name };
    } catch (error) {
      const apiError = error as ApiError;
      return { success: false, message: apiError.message || 'Login failed. Please try again.' };
    }
  };

  const register = async (name: string, email: string, password: string, phone?: string): Promise<{ success: boolean; message: string }> => {
    try {
      const data = await customerService.register(name, email, password, phone);
      saveAuth(data, data.token);
      return { success: true, message: 'Account created successfully' };
    } catch (error) {
      const apiError = error as ApiError;
      return { success: false, message: apiError.message || 'Registration failed. Please try again.' };
    }
  };

  const logout = () => {
    clearAuth();
  };

  const fetchProfile = useCallback(async () => {
    if (!token) return;

    try {
      const data = await customerService.getMe(token);
      setCustomer(prev => {
        const updatedCustomer = { ...prev, ...data };
        // Also update localStorage with full profile data
        const savedData = getCustomerAuth();
        if (savedData && savedData.token) {
          saveCustomerAuth({ customer: updatedCustomer, token: savedData.token });
        }
        return updatedCustomer;
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  }, [token]); // Only depend on token, not customer

  const updateProfile = async (updates: Partial<Customer>): Promise<{ success: boolean; message: string }> => {
    if (!token) return { success: false, message: 'Not authenticated' };

    try {
      const data = await customerService.updateProfile(updates, token);
      setCustomer(prev => {
        const updatedCustomer = prev ? { ...prev, ...data } : null;
        if (updatedCustomer) {
          saveCustomerAuth({ customer: updatedCustomer, token });
        }
        return updatedCustomer;
      });
      return { success: true, message: 'Profile updated' };
    } catch (error) {
      const apiError = error as ApiError;
      return { success: false, message: apiError.message || 'Update failed. Please try again.' };
    }
  };

  const fetchOrders = useCallback(async () => {
    if (!token) return;

    try {
      const data = await customerService.getOrders(token);
      setOrders(data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  }, [token]);

  const saveDesign = async (design: Omit<SavedDesign, '_id' | 'savedAt'>): Promise<{ success: boolean; message: string }> => {
    if (!token) return { success: false, message: 'Please login to save designs' };

    try {
      const result = await customerService.saveDesign(design, token);

      // Optimized: Update state directly if backend returns updated list
      if (result.success && result.data) {
        setCustomer(prev => {
          if (!prev) return null;
          const updatedCustomer = { ...prev, savedDesigns: result.data };

          // Sync with localStorage
          const savedData = getCustomerAuth();
          if (savedData && savedData.token) {
            saveCustomerAuth({ customer: updatedCustomer, token: savedData.token });
          }
          return updatedCustomer;
        });
      } else {
        // Fallback
        await fetchProfile();
      }

      return { success: result.success, message: result.message };
    } catch (error) {
      const apiError = error as ApiError;
      return { success: false, message: apiError.message || 'Failed to save design' };
    }
  };

  const deleteDesign = async (id: string): Promise<{ success: boolean; message: string }> => {
    if (!token) return { success: false, message: 'Not authenticated' };

    const originalCustomer = customer;

    // Optimistic update
    setCustomer(prev => {
      if (!prev) return null;
      return {
        ...prev,
        savedDesigns: prev.savedDesigns?.filter(d => d._id !== id) || []
      };
    });

    try {
      const result = await customerService.deleteDesign(id, token);
      // Background refresh to ensure sync, but user sees instant deletion
      fetchProfile();
      return result;
    } catch (error) {
      // Rollback on error
      setCustomer(originalCustomer);
      const apiError = error as ApiError;
      return { success: false, message: apiError.message || 'Failed to delete design' };
    }
  };

  const saveMeasurements = async (measurements: Omit<SavedMeasurement, '_id' | 'createdAt'>): Promise<{ success: boolean; message: string }> => {
    if (!token) return { success: false, message: 'Please login to save measurements' };

    try {
      const result = await customerService.saveMeasurements(measurements, token);
      // Refresh profile to get updated savedMeasurements
      await fetchProfile();
      return result;
    } catch (error) {
      const apiError = error as ApiError;
      return { success: false, message: apiError.message || 'Failed to save measurements' };
    }
  };

  const deleteMeasurements = async (id: string): Promise<{ success: boolean; message: string }> => {
    if (!token) return { success: false, message: 'Not authenticated' };

    try {
      const result = await customerService.deleteMeasurements(id, token);
      // Refresh profile to get updated savedMeasurements
      await fetchProfile();
      return result;
    } catch (error) {
      const apiError = error as ApiError;
      return { success: false, message: apiError.message || 'Failed to delete measurements' };
    }
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        customer,
        token,
        isAuthenticated: !!customer && !!token,
        isLoading,
        orders,
        login,
        register,
        logout,
        updateProfile,
        fetchOrders,
        fetchProfile,
        saveDesign,
        deleteDesign,
        saveMeasurements,
        deleteMeasurements,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (context === undefined) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
}
