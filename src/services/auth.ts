/**
 * Authentication service - Centralized API calls for admin authentication
 * Uses apiClient for consistent error handling
 */
import { apiClient } from '@/lib/apiClient';

export interface AdminLoginResponse {
  admin: {
    _id: string;
    username: string;
    email: string;
    role: string;
  };
  token: string;
}

export interface AdminRegisterResponse {
  admin: {
    _id: string;
    username: string;
    email: string;
    role: string;
  };
  token: string;
}

export const adminAuthService = {
  /**
   * Admin login (accepts email or username)
   */
  login: async (email: string, password: string): Promise<AdminLoginResponse> => {
    return apiClient.post<AdminLoginResponse>('/admin/login', { email, password });
  },

  /**
   * Admin register
   */
  register: async (
    name: string,
    email: string,
    password: string,
    inviteCode: string
  ): Promise<AdminRegisterResponse> => {
    return apiClient.post<AdminRegisterResponse>('/admin/register', {
      name,
      email,
      password,
      inviteCode,
    });
  },

  /**
   * Get current admin (requires token)
   */
  getMe: async (token: string): Promise<AdminLoginResponse['admin']> => {
    return apiClient.get<AdminLoginResponse['admin']>('/admin/me', {
      Authorization: `Bearer ${token}`,
    });
  },

  /**
   * Change password (requires token)
   */
  changePassword: async (
    currentPassword: string,
    newPassword: string,
    token: string
  ): Promise<{ success: boolean; message: string }> => {
    return apiClient.post<{ success: boolean; message: string }>(
      '/admin/change-password',
      { currentPassword, newPassword },
      { Authorization: `Bearer ${token}` }
    );
  },

  /**
   * Request password reset
   */
  forgotPassword: async (email: string): Promise<{ success: boolean; message: string; resetToken?: string }> => {
    return apiClient.post<{ success: boolean; message: string; resetToken?: string }>('/admin/forgot-password', {
      email,
    });
  },

  /**
   * Reset password with token
   */
  resetPassword: async (token: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.post<{ success: boolean; message: string }>('/admin/reset-password', {
      token,
      newPassword,
    });
  },
};
