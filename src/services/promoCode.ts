import { apiClient } from '@/lib/apiClient';

export interface PromoValidationResult {
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    discountAmount: number;
    description: string;
}

export interface PromoCode {
    _id: string;
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minOrderAmount: number;
    maxUses: number | null;
    usedCount: number;
    validFrom: string;
    validUntil: string | null;
    isActive: boolean;
    description: string;
    createdAt: string;
}

export const promoCodeService = {
    validate: async (code: string, orderAmount: number): Promise<PromoValidationResult> => {
        return apiClient.post<PromoValidationResult>('/promo/validate', { code, orderAmount });
    },

    // Admin
    getAll: async (token: string): Promise<PromoCode[]> => {
        return apiClient.get<PromoCode[]>('/admin/promo', { Authorization: `Bearer ${token}` });
    },

    create: async (data: Partial<PromoCode>, token: string): Promise<PromoCode> => {
        return apiClient.post<PromoCode>('/admin/promo', data, { Authorization: `Bearer ${token}` });
    },

    update: async (id: string, data: Partial<PromoCode>, token: string): Promise<PromoCode> => {
        return apiClient.patch<PromoCode>(`/admin/promo/${id}`, data, { Authorization: `Bearer ${token}` });
    },

    delete: async (id: string, token: string): Promise<void> => {
        return apiClient.delete<void>(`/admin/promo/${id}`, { Authorization: `Bearer ${token}` });
    },
};
