/**
 * Product service - Centralized API calls for products
 * Uses apiClient for consistent error handling
 */
import { apiClient } from '@/lib/apiClient';
import type { Product } from '@/types/product';

export const productService = {
  /**
   * Get all products
   */
  getAll: async (): Promise<Product[]> => {
    return apiClient.get<Product[]>('/products');
  },

  /**
   * Get product by ID
   */
  getById: async (id: string): Promise<Product> => {
    return apiClient.get<Product>(`/products/${id}`);
  },

  /**
   * Create product (admin only)
   */
  create: async (product: Partial<Product>, token: string): Promise<Product> => {
    return apiClient.post<Product>('/products', product, {
      Authorization: `Bearer ${token}`,
    });
  },

  /**
   * Update product (admin only)
   */
  update: async (id: string, updates: Partial<Product>, token: string): Promise<Product> => {
    return apiClient.put<Product>(`/products/${id}`, updates, {
      Authorization: `Bearer ${token}`,
    });
  },

  /**
   * Delete product (admin only)
   */
  delete: async (id: string, token: string): Promise<void> => {
    return apiClient.delete<void>(`/products/${id}`, {
      Authorization: `Bearer ${token}`,
    });
  },
};

// Legacy exports for backward compatibility (deprecated - use productService)
export async function getProducts(): Promise<Product[]> {
  return productService.getAll();
}

export async function getProductById(id: string): Promise<Product> {
  return productService.getById(id);
}
