/**
 * Customer service - Centralized API calls for customer operations
 * Uses apiClient for consistent error handling
 */
import { apiClient } from '@/lib/apiClient';

export interface CustomerLoginResponse {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  token: string;
}

export interface CustomerRegisterResponse {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  token: string;
}

export interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  savedDesigns?: any[];
  savedMeasurements?: any[];
}

export interface Order {
  _id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  items: any[];
}

export const customerService = {
  /**
   * Customer login
   */
  login: async (email: string, password: string): Promise<CustomerLoginResponse> => {
    return apiClient.post<CustomerLoginResponse>('/customers/login', { email, password });
  },

  /**
   * Customer register
   */
  register: async (
    name: string,
    email: string,
    password: string,
    phone?: string
  ): Promise<CustomerRegisterResponse> => {
    return apiClient.post<CustomerRegisterResponse>('/customers/register', {
      name,
      email,
      password,
      phone,
    });
  },

  /**
   * Get current customer (requires token)
   */
  getMe: async (token: string): Promise<Customer> => {
    return apiClient.get<Customer>('/customers/me', {
      Authorization: `Bearer ${token}`,
    });
  },

  /**
   * Update customer profile (requires token)
   */
  updateProfile: async (updates: Partial<Customer>, token: string): Promise<Customer> => {
    const res = await apiClient.patch<{ success?: boolean; data?: Customer }>('/customers/me', updates, {
      Authorization: `Bearer ${token}`,
    });
    const body = res as { data?: Customer };
    return body.data ?? (res as Customer);
  },

  /**
   * Get customer orders (requires token)
   */
  getOrders: async (token: string): Promise<Order[]> => {
    return apiClient.get<Order[]>('/customers/orders', {
      Authorization: `Bearer ${token}`,
    });
  },

  /**
   * Save design (requires token)
   */
  saveDesign: async (design: any, token: string): Promise<{ success: boolean; message: string; data?: any[] }> => {
    const response = await apiClient.postWithMeta<any[]>('/customers/designs', design, {
      Authorization: `Bearer ${token}`,
    });
    return {
      success: response.success ?? false,
      message: response.message || (response.success ? 'Design saved' : 'Failed to save design'),
      data: response.data
    };
  },

  /**
   * Delete saved design (requires token)
   */
  deleteDesign: async (designId: string, token: string): Promise<{ success: boolean; message: string }> => {
    await apiClient.delete(`/customers/designs/${designId}`, {
      Authorization: `Bearer ${token}`,
    });
    return { success: true, message: 'Design deleted' };
  },

  /**
   * Delete customer-owned asset from Cloudinary (screenshot, profile image).
   * Only works for URLs in saved-designs, cart, or profiles folders.
   */
  deleteAsset: async (url: string, token: string): Promise<{ success: boolean; deleted?: boolean }> => {
    const res = await apiClient.post<{ success?: boolean; data?: { deleted?: boolean } }>(
      '/customers/delete-asset',
      { url },
      { Authorization: `Bearer ${token}` }
    );
    const body = res as { success?: boolean; data?: { deleted?: boolean } };
    return { success: body.success ?? false, deleted: body.data?.deleted };
  },

  /**
   * Save measurements (requires token)
   */
  saveMeasurements: async (measurements: any, token: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.post<{ success: boolean; message: string }>('/customers/measurements', measurements, {
      Authorization: `Bearer ${token}`,
    });
  },

  /**
   * Delete saved measurements (requires token)
   */
  deleteMeasurements: async (
    measurementId: string,
    token: string
  ): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete<{ success: boolean; message: string }>(`/customers/measurements/${measurementId}`, {
      Authorization: `Bearer ${token}`,
    });
  },

  /**
   * Request password reset
   */
  forgotPassword: async (email: string): Promise<{ success: boolean; message: string; resetToken?: string }> => {
    return apiClient.post<{ success: boolean; message: string; resetToken?: string }>('/customers/forgot-password', {
      email,
    });
  },

  /**
   * Reset password with token
   */
  resetPassword: async (token: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.post<{ success: boolean; message: string }>('/customers/reset-password', {
      token,
      newPassword,
    });
  },
};
