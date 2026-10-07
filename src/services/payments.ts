/**
 * Payment Service — Safepay API calls
 */
import { apiClient } from '@/lib/apiClient';

export interface SafepayTrackerResponse {
    tracker: string;
    checkoutUrl?: string; // Built via V3 API rules
}

export const paymentService = {
    /** Step 1: Create a Safepay tracker for an existing order */
    createSafepayTracker: async (orderId: string, callbackUrl: string): Promise<SafepayTrackerResponse> => {
        return apiClient.post<SafepayTrackerResponse>('/payments/safepay/intent', { orderId, callbackUrl });
    },

    /** Admin: Initiate refund for a Safepay order */
    initiateSafepayRefund: async (orderId: string, token: string): Promise<{ message: string }> => {
        return apiClient.post<{ message: string }>(
            '/payments/safepay/refund',
            { orderId },
            { Authorization: `Bearer ${token}` }
        );
    },
    /** Step 2 (Fallback): Verify a successful Safepay payment synchronously */
    verifySafepayCallback: async (params: { orderId: string, tracker: string }): Promise<{ orderNumber?: string }> => {
        return apiClient.post<{ orderNumber?: string }>('/payments/safepay/verify-callback', params);
    },
};
