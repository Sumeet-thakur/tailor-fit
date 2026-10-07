import { apiClient } from '@/lib/apiClient';

export interface SiteSettings {
  homepageCtaVideoUrl?: string;
  is2DEnabled?: boolean;
  updatedAt?: string;
}

export const settingsService = {
  getSettings: async (): Promise<SiteSettings> => {
    try {
      const response = await apiClient.get<any>('/settings');
      return response || {};
    } catch (error) {
      console.error('Error fetching site settings', error);
      return {};
    }
  },

  updateSettings: async (data: Partial<SiteSettings>, token: string): Promise<{ success: boolean; settings?: SiteSettings; error?: string }> => {
    try {
      const response = await apiClient.put<any>('/admin/settings', data, {
        Authorization: `Bearer ${token}`
      });
      return { success: true, settings: response };
    } catch (error: any) {
      return { success: false, error: error.message || error.response?.data?.error || 'Failed to update settings' };
    }
  }
};

