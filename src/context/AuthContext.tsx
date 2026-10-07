import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminAuthService } from '@/services/auth';
import { ApiError } from '@/lib/apiClient';

// Legacy admin credentials (fallback for offline/development)
const LEGACY_ADMIN = {
  username: 'admin',
  password: '#MiAdmin$',
};

interface Admin {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'super_admin';
  isActive: boolean;
  profileImage?: string;
  lastLogin?: string;
  createdAt?: string;
}

interface AuthContextType {
  admin: Admin | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string; name?: string }>;
  register: (name: string, email: string, password: string, inviteCode: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  updateAdmin: (updates: Partial<Admin>) => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string; resetToken?: string }>;
  resetPassword: (email: string, resetToken: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

import { getAdminAuth, saveAdminAuth, removeAdminAuth, hasLegacyAdminAuth, type AdminAuthData } from '@/lib/authStorage';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved auth on mount
  useEffect(() => {
    // Check for new admin auth
    const savedData = getAdminAuth();
    if (savedData && savedData.admin && savedData.token) {
      setAdmin(savedData.admin);
      setToken(savedData.token);

      // Verify token is still valid in the background (skip for legacy tokens)
      if (savedData.token !== 'legacy-token') {
        adminAuthService.getMe(savedData.token).catch((err: any) => {
          if (err?.status === 401) {
            // Token expired — auto-logout silently
            removeAdminAuth();
            setAdmin(null);
            setToken(null);
          }
        });
      }

      setIsLoading(false);
      return;
    }

    // Check for legacy auth
    if (hasLegacyAdminAuth()) {
      // Create a mock admin for legacy auth
      const legacyAdmin: Admin = {
        _id: 'legacy-admin',
        name: 'Admin',
        email: 'admin@tailorfit.local',
        role: 'super_admin',
        isActive: true,
      };
      setAdmin(legacyAdmin);
      setToken('legacy-token');
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message: string; name?: string }> => {
    // Check for legacy admin credentials first
    if (email === LEGACY_ADMIN.username && password === LEGACY_ADMIN.password) {
      const legacyAdmin: Admin = {
        _id: 'legacy-admin',
        name: 'Admin',
        email: 'admin@tailorfit.local',
        role: 'super_admin',
        isActive: true,
      };
      setAdmin(legacyAdmin);
      setToken('legacy-token');
      saveAdminAuth({ admin: legacyAdmin, token: 'legacy-token' });
      return { success: true, message: 'Login successful', name: legacyAdmin.name };
    }

    try {
      const responseData = await adminAuthService.login(email, password);
      // Backend returns data: { _id, name, email, role, token } (flat object)
      const data = responseData as { _id?: string; name?: string; email?: string; role?: string; token?: string };
      if (!data || data._id == null || !data.token) {
        return { success: false, message: 'Invalid response from server' };
      }
      const adminObj: Admin = {
        _id: data._id,
        name: data.name ?? 'Admin',
        email: data.email ?? '',
        role: (data.role as 'admin' | 'super_admin') ?? 'admin',
        isActive: true,
      };

      setAdmin(adminObj);
      setToken(data.token);
      saveAdminAuth({ admin: adminObj, token: data.token });

      return { success: true, message: 'Login successful', name: adminObj.name };
    } catch (error) {
      const apiError = error as ApiError;
      return { success: false, message: apiError.message || 'Failed to connect to server' };
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    inviteCode: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const responseData = await adminAuthService.register(name, email, password, inviteCode);
      // API returns { admin: { _id, name, email, role }, token }
      const { token: newToken, admin: adminData } = responseData;
      const adminObj: Admin = {
        _id: adminData._id,
        name: (adminData as any).name || adminData.username || 'Admin',
        email: adminData.email,
        role: adminData.role as 'admin' | 'super_admin',
        isActive: true,
      };

      setAdmin(adminObj);
      setToken(newToken);
      saveAdminAuth({ admin: adminObj, token: newToken });

      return { success: true, message: 'Registration successful' };
    } catch (error) {
      const apiError = error as ApiError;
      return { success: false, message: apiError.message || 'Failed to connect to server' };
    }
  };

  const logout = () => {
    setAdmin(null);
    setToken(null);
    removeAdminAuth();
  };

  const fetchProfile = useCallback(async () => {
    if (!token || token === 'legacy-token') return;

    try {
      const data = await adminAuthService.getMe(token);
      const adminObj: Admin = {
        _id: data._id,
        name: (data as any).name || (data as any).username || 'Admin',
        email: data.email,
        role: data.role as 'admin' | 'super_admin',
        isActive: true,
      };
      setAdmin(adminObj);
      const savedData = getAdminAuth();
      if (savedData && savedData.token) {
        saveAdminAuth({ admin: adminObj, token: savedData.token });
      }
    } catch (error) {
      console.error('Failed to fetch admin profile:', error);
    }
  }, [token]);

  // Update admin state and localStorage
  const updateAdmin = useCallback((updates: Partial<Admin>) => {
    setAdmin(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      // Update localStorage
      const savedData = getAdminAuth();
      if (savedData && savedData.token) {
        saveAdminAuth({ admin: updated, token: savedData.token });
      }
      return updated;
    });
  }, []);

  const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    if (!token || token === 'legacy-token') return { success: false, message: 'Not authenticated' };

    try {
      const result = await adminAuthService.changePassword(currentPassword, newPassword, token);
      return result;
    } catch (error) {
      const apiError = error as ApiError;
      return { success: false, message: apiError.message || 'Failed to connect to server' };
    }
  };

  const forgotPassword = async (email: string): Promise<{ success: boolean; message: string; resetToken?: string }> => {
    try {
      const result = await adminAuthService.forgotPassword(email);
      return result;
    } catch (error) {
      const apiError = error as ApiError;
      return { success: false, message: apiError.message || 'Failed to connect to server' };
    }
  };

  const resetPassword = async (email: string, resetToken: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    try {
      const result = await adminAuthService.resetPassword(resetToken, newPassword);
      return result;
    } catch (error) {
      const apiError = error as ApiError;
      return { success: false, message: apiError.message || 'Failed to connect to server' };
    }
  };

  const isAuthenticated = !!admin && !!token;
  const isSuperAdmin = admin?.role === 'super_admin';

  return (
    <AuthContext.Provider
      value={{
        admin,
        token,
        isAuthenticated,
        isLoading,
        isSuperAdmin,
        login,
        register,
        logout,
        fetchProfile,
        updateAdmin,
        changePassword,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
