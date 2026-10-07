/**
 * Centralized toast notification helpers
 * Provides consistent toast patterns across the application
 * 
 * Usage:
 *   import { showSuccess, showError, showLoading } from '@/lib/toastHelpers';
 *   showSuccess('Order placed successfully');
 */

import { toast } from 'sonner';

export const toastHelpers = {
  /**
   * Show success toast
   */
  success: (message: string, description?: string) => {
    toast.success(message, description ? { description } : undefined);
  },

  /**
   * Show error toast
   */
  error: (message: string, description?: string) => {
    toast.error(message, description ? { description } : undefined);
  },

  /**
   * Show info toast
   */
  info: (message: string, description?: string) => {
    toast.info(message, description ? { description } : undefined);
  },

  /**
   * Show warning toast
   */
  warning: (message: string, description?: string) => {
    toast.warning(message, description ? { description } : undefined);
  },

  /**
   * Show loading toast and return dismiss function
   */
  loading: (message: string): (() => void) => {
    const toastId = toast.loading(message);
    return () => toast.dismiss(toastId);
  },

  /**
   * Show promise toast (auto handles success/error)
   */
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ) => {
    return toast.promise(promise, messages);
  },
};

// Export individual functions for convenience
export const showSuccess = toastHelpers.success;
export const showError = toastHelpers.error;
export const showInfo = toastHelpers.info;
export const showWarning = toastHelpers.warning;
export const showLoading = toastHelpers.loading;
export const showPromise = toastHelpers.promise;
