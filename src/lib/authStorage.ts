/**
 * Centralized utilities for managing authentication data in localStorage
 * Single source of truth for auth storage operations
 */

const ADMIN_AUTH_KEY = 'admin-auth';
const ADMIN_STORAGE_KEY = 'tailor_fit_admin';

export interface AdminAuthData {
  admin: {
    _id: string;
    name: string;
    email: string;
    role: 'admin' | 'super_admin';
    isActive: boolean;
  };
  token: string;
}

/**
 * Get admin auth data from localStorage
 */
export function getAdminAuth(): AdminAuthData | null {
  try {
    const savedData = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!savedData) return null;
    return JSON.parse(savedData);
  } catch (error) {
    console.error('Error reading admin auth from localStorage:', error);
    return null;
  }
}

/**
 * Save admin auth data to localStorage
 */
export function saveAdminAuth(authData: AdminAuthData): void {
  try {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(authData));
    // Also set legacy auth for backwards compatibility
    localStorage.setItem(ADMIN_AUTH_KEY, 'true');
  } catch (error) {
    console.error('Error saving admin auth to localStorage:', error);
  }
}

/**
 * Remove admin auth data from localStorage
 */
export function removeAdminAuth(): void {
  try {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    localStorage.removeItem(ADMIN_AUTH_KEY);
  } catch (error) {
    console.error('Error removing admin auth from localStorage:', error);
  }
}

/**
 * Check if legacy admin auth exists
 */
export function hasLegacyAdminAuth(): boolean {
  return localStorage.getItem(ADMIN_AUTH_KEY) === 'true';
}

// Customer Auth Storage
const CUSTOMER_STORAGE_KEY = 'tailor_fit_customer';

export interface CustomerAuthData {
  customer: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    address?: any;
  };
  token: string;
}

/**
 * Get customer auth data from localStorage
 */
export function getCustomerAuth(): CustomerAuthData | null {
  try {
    const savedData = localStorage.getItem(CUSTOMER_STORAGE_KEY);
    if (!savedData) return null;
    return JSON.parse(savedData);
  } catch (error) {
    console.error('Error reading customer auth from localStorage:', error);
    return null;
  }
}

/**
 * Save customer auth data to localStorage
 */
export function saveCustomerAuth(authData: CustomerAuthData): void {
  try {
    localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(authData));
  } catch (error) {
    console.error('Error saving customer auth to localStorage:', error);
  }
}

/**
 * Remove customer auth data from localStorage
 */
export function removeCustomerAuth(): void {
  try {
    localStorage.removeItem(CUSTOMER_STORAGE_KEY);
  } catch (error) {
    console.error('Error removing customer auth from localStorage:', error);
  }
}
