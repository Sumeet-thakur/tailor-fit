/**
 * Order service - Centralized API calls for orders
 * Uses apiClient for consistent error handling
 */
import { apiClient } from '@/lib/apiClient';

export interface OrderItem {
  productId: string;
  productName: string;
  productCategory: string;
  baseImage: string;
  fabric: any;
  styles: Record<string, any>;
  measurements: Record<string, any>;
  basePrice: number;
  totalPrice: number;
  quantity: number;
  screenshot?: string;
}

export interface CreateOrderPayload {
  customer: {
    name: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  paymentMethod: 'cod' | 'bank_transfer' | 'safepay';
  paymentGateway?: 'safepay' | 'none';
  discount?: number;
  promoCode?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  items: OrderItem[];
  total: number;
  status: string;
  paymentMethod: string;
  paymentStatus?: string;
  paymentGateway?: string;
  paymentDetails?: Record<string, any>;
  transactionId?: string;
  discount?: number;
  promoCode?: string;
  cancelReason?: string;
  createdAt: string;
}

export const orderService = {
  /**
   * Create order
   */
  create: async (orderData: CreateOrderPayload): Promise<{ orderNumber: string }> => {
    return apiClient.post<{ orderNumber: string }>('/orders', orderData);
  },

  /**
   * Get order by order number
   */
  getByOrderNumber: async (orderNumber: string): Promise<Order> => {
    return apiClient.get<Order>(`/orders/${orderNumber}`);
  },

  /**
   * Get all orders (admin/customer, requires token)
   */
  getAll: async (token?: string): Promise<Order[]> => {
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    return apiClient.get<Order[]>('/orders', headers);
  },

  /**
   * Update order status (admin only, requires token)
   */
  updateStatus: async (orderId: string, status: string, token: string): Promise<Order> => {
    return apiClient.patch<Order>(
      `/orders/${orderId}/status`,
      { status },
      { Authorization: `Bearer ${token}` }
    );
  },

  /**
   * Update payment details (transaction ID, payment status).
   * Can be called by customer (to submit txn ID) or admin (to mark paid).
   */
  updatePaymentDetails: async (
    orderId: string,
    payload: { paymentStatus?: string; transactionId?: string },
    token?: string
  ): Promise<Order> => {
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    return apiClient.patch<Order>(`/orders/${orderId}/payment`, payload, headers);
  },
};

