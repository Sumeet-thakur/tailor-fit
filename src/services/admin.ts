/**
 * Admin service - Centralized API calls for admin operations
 * Uses apiClient for consistent error handling
 */
import { apiClient } from '@/lib/apiClient';

export interface Admin {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'super_admin';
  isActive: boolean;
}

export interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: any;
  savedDesigns?: any[];
  savedMeasurements?: any[];
  recentOrders?: any[];
  stats?: {
    total: number;
    delivered: number;
    cancelled: number;
    active: number;
    totalSpent: number;
  };
}

export interface Fabric3D {
  _id: string;
  name: string;
  category: string;
  price: number;
  colorMapUrl?: string;
  thumbnailUrl?: string;
  [key: string]: any;
}

export const adminService = {
  /**
   * Create admin (super_admin only)
   */
  createAdmin: async (
    name: string,
    email: string,
    password: string,
    inviteCode: string,
    token: string
  ): Promise<Admin> => {
    return apiClient.post<Admin>(
      '/admin/create',
      { name, email, password, inviteCode },
      { Authorization: `Bearer ${token}` }
    );
  },

  /**
   * Get all customers (admin only)
   */
  getCustomers: async (token: string): Promise<Customer[]> => {
    return apiClient.get<Customer[]>('/admin/customers', {
      Authorization: `Bearer ${token}`,
    });
  },

  /**
   * Get customer details (admin only)
   */
  getCustomerDetails: async (customerId: string, token: string): Promise<Customer> => {
    return apiClient.get<Customer>(`/admin/customers/${customerId}`, {
      Authorization: `Bearer ${token}`,
    });
  },

  /**
   * Reset customer password (admin only)
   */
  resetCustomerPassword: async (
    customerId: string,
    newPassword: string,
    token: string
  ): Promise<{ success: boolean; message: string }> => {
    return apiClient.post<{ success: boolean; message: string }>(
      `/admin/customers/${customerId}/reset-password`,
      { newPassword },
      { Authorization: `Bearer ${token}` }
    );
  },

  /**
   * Get all admins (super_admin only)
   */
  getAdmins: async (token: string): Promise<Admin[]> => {
    return apiClient.get<Admin[]>('/admin/list', {
      Authorization: `Bearer ${token}`,
    });
  },

  /**
   * Activate/deactivate admin (super_admin only)
   */
  toggleAdminStatus: async (
    adminId: string,
    activate: boolean,
    token: string
  ): Promise<{ success: boolean; message: string }> => {
    return apiClient.patch<{ success: boolean; message: string }>(
      `/admin/${adminId}/status`,
      { isActive: activate },
      { Authorization: `Bearer ${token}` }
    );
  },

  /**
   * Get all orders (admin only)
   */
  getOrders: async (token: string): Promise<any[]> => {
    return apiClient.get<any[]>('/orders', {
      Authorization: `Bearer ${token}`,
    });
  },

  /**
   * Delete order (admin only)
   */
  deleteOrder: async (orderId: string, token: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete<{ success: boolean; message: string }>(`/admin/orders/${orderId}`, {
      Authorization: `Bearer ${token}`,
    });
  },

  /**
   * Update order status (admin only)
   */
  updateOrderStatus: async (
    orderId: string,
    status: string,
    token: string
  ): Promise<{ success: boolean; message: string }> => {
    return apiClient.patch<{ success: boolean; message: string }>(
      `/orders/${orderId}/status`,
      { status },
      { Authorization: `Bearer ${token}` }
    );
  },

  /**
   * Update payment details (admin only)
   */
  updatePaymentDetails: async (
    orderId: string,
    paymentData: {
      transactionId?: string;
      paymentStatus?: string;
      paymentGateway?: string;
    },
    token: string
  ): Promise<{ success: boolean; message: string }> => {
    return apiClient.patch<{ success: boolean; message: string }>(
      `/admin/orders/${orderId}/payment`,
      paymentData,
      { Authorization: `Bearer ${token}` }
    );
  },

  /**
   * Get all 3D fabrics, or fabrics for a specific product when productId is provided
   */
  getFabrics: async (productId?: string): Promise<Fabric3D[]> => {
    const query = productId ? `?productId=${encodeURIComponent(productId)}` : '';
    return apiClient.get<Fabric3D[]>(`/fabrics${query}`);
  },

  /**
   * Create/update 3D fabric (admin only)
   */
  saveFabric: async (fabricData: Partial<Fabric3D>, token: string): Promise<Fabric3D> => {
    if (fabricData._id) {
      return apiClient.put<Fabric3D>(`/fabrics/${fabricData._id}`, fabricData, {
        Authorization: `Bearer ${token}`,
      });
    }
    return apiClient.post<Fabric3D>('/fabrics', fabricData, {
      Authorization: `Bearer ${token}`,
    });
  },

  /**
   * Delete 3D fabric (admin only)
   */
  deleteFabric: async (fabricId: string, token: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete<{ success: boolean; message: string }>(`/fabrics/${fabricId}`, {
      Authorization: `Bearer ${token}`,
    });
  },

  /**
   * Upload file (admin only)
   */
  uploadFile: async (formData: FormData, token: string): Promise<{ path: string }> => {
    return apiClient.upload<{ path: string }>('/upload', formData, {
      Authorization: `Bearer ${token}`,
    });
  },

  /**
   * Upload 3D texture with server-side WebP conversion (admin only).
   * Uses dedicated /upload/texture route that bypasses upload_stream
   * (which silently ignores the format param) and uses uploader.upload()
   * which DOES enforce format: 'webp'.
   */
  uploadTexture: async (formData: FormData, token: string): Promise<{ path: string; size: number }> => {
    return apiClient.upload<{ path: string; size: number }>('/upload/texture', formData, {
      Authorization: `Bearer ${token}`,
    });
  },

  /**
   * Delete image from Cloudinary by URL (admin only)
   */
  deleteImageFromCloudinary: async (url: string, token: string): Promise<{ deleted: boolean }> => {
    return apiClient.post<{ deleted: boolean }>(
      '/admin/upload/delete',
      { url },
      { Authorization: `Bearer ${token}` }
    );
  },

  /**
   * Delete multiple images and their folder from Cloudinary (admin only)
   */
  deleteImagesFromCloudinary: async (urls: string[], token: string): Promise<{ deleted: number }> => {
    const res = await apiClient.post<{ deleted?: number }>(
      '/admin/upload/delete-many',
      { urls },
      { Authorization: `Bearer ${token}` }
    );
    return { deleted: res?.deleted ?? 0 };
  },

  /**
   * Delete all assets under a folder prefix from Cloudinary (admin only)
   */
  deleteByPrefix: async (prefix: string, token: string): Promise<{ deleted: number }> => {
    const res = await apiClient.post<{ deleted?: number }>(
      '/admin/upload/delete-by-prefix',
      { prefix },
      { Authorization: `Bearer ${token}` }
    );
    return { deleted: res?.deleted ?? 0 };
  },

  /**
   * Get fabric usage count (how many products reference this fabric)
   */
  getFabricUsage: async (fabricId: string, token: string): Promise<{ count: number }> => {
    const data = await apiClient.get<{ count: number }>(`/admin/fabric-usage/${fabricId}`, {
      Authorization: `Bearer ${token}`,
    });
    return data ?? { count: 0 };
  },

  /**
   * Get asset usage count (how many products use this URL as model or HDRI)
   */
  getAssetUsage: async (url: string, token: string): Promise<{ count: number }> => {
    const encoded = encodeURIComponent(url);
    const data = await apiClient.get<{ count: number }>(`/admin/asset-usage?url=${encoded}`, {
      Authorization: `Bearer ${token}`,
    });
    return data ?? { count: 0 };
  },

  /**
   * AI Chat Analytics (super_admin only)
   */
  getAIChatAnalytics: async (
    token: string,
    days: number = 7
  ): Promise<{
    aiMessageCount: number;
    escalationCount: number;
    escalationRatePercent: string | number;
    totalTokensUsed: number;
    periodDays: number;
    modelName: string;
    provider: string;
  }> => {
    return apiClient.get<{
      aiMessageCount: number;
      escalationCount: number;
      escalationRatePercent: string | number;
      totalTokensUsed: number;
      periodDays: number;
      modelName: string;
      provider: string;
    }>(`/admin/ai-chat/analytics?days=${days}`, {
      Authorization: `Bearer ${token}`,
    });
  },
};
