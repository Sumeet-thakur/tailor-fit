/**
 * Centralized API client with consistent error handling
 * Single source of truth for all API calls
 * 
 * Usage:
 *   import { apiClient } from '@/lib/apiClient';
 *   const products = await apiClient.get<Product[]>('/products');
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiError {
  message: string;
  status?: number;
  data?: unknown;
}

/**
 * Resolves the correct API base URL for any environment:
 *  - Local dev: VITE_API_URL is unset → falls back to '/api' (Vite proxy handles it)
 *  - Staging/Prod/Mobile APK: VITE_API_URL is set → uses absolute URL like 'https://api.example.com/api'
 */
const resolveBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) return '/api';

  // Strip trailing slash, then append /api if the env URL doesn't already end with it
  const cleaned = envUrl.replace(/\/+$/, '');
  return cleaned.endsWith('/api') ? cleaned : `${cleaned}/api`;
};

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = resolveBaseUrl()) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    try {
      console.log(`[API CLIENT] Fetching: ${url}`);
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw {
          message: data.error || data.message || 'Request failed',
          status: response.status,
          data,
        } as ApiError;
      }

      return data as ApiResponse<T>;
    } catch (error: any) {
      const debugInfo = `URL: ${url} | Origin: ${typeof window !== 'undefined' ? window.location.origin : 'N/A'}`;
      if (error && typeof error === 'object' && 'message' in error) {
        error.message = `${error.message}\n(${debugInfo})`;
        throw error as ApiError;
      }
      throw {
        message: `Network error. Please check your connection.\n(${debugInfo})`,
        status: 0,
      } as ApiError;
    }
  }

  async get<T>(endpoint: string, headers?: HeadersInit): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'GET',
      headers,
    });
    return response.data as T;
  }

  async post<T>(endpoint: string, body?: unknown, headers?: HeadersInit): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    return response.data as T;
  }

  /** Returns full response for endpoints that return { success, message, data } */
  async postWithMeta<T>(endpoint: string, body?: unknown, headers?: HeadersInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  }

  async put<T>(endpoint: string, body?: unknown, headers?: HeadersInit): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    return response.data as T;
  }

  async patch<T>(endpoint: string, body?: unknown, headers?: HeadersInit): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });
    return response.data as T;
  }

  async delete<T>(endpoint: string, headers?: HeadersInit): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'DELETE',
      headers,
    });
    return response.data as T;
  }

  /**
   * Upload file with FormData
   */
  async upload<T>(endpoint: string, formData: FormData, headers?: HeadersInit): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    if (import.meta.env.DEV) console.log('[apiClient] Upload request:', url);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        // Don't set Content-Type for FormData - browser will set it with boundary
      },
      body: formData,
    });

    const data = await response.json().catch((parseErr) => {
      console.error('[apiClient] Upload response parse failed:', parseErr);
      return {};
    });

    if (!response.ok) {
      const err = {
        message: data.error || data.message || 'Upload failed',
        status: response.status,
        data,
      } as ApiError;
      console.error('[apiClient] Upload failed:', { url, status: response.status, data });
      throw err;
    }

    // Handle both { data: T } and direct T responses
    return (data.data !== undefined ? data.data : data) as T;
  }
}

export const apiClient = new ApiClient();
