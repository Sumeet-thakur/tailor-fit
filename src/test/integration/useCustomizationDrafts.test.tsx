import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCustomizationDrafts } from '@/hooks/customize/useCustomizationDrafts';
import * as CustomizationContext from '@/context/CustomizationContext';
import * as CustomerAuthContext from '@/context/CustomerAuthContext';
import * as SavedDesignsStorage from '@/lib/savedDesignsStorage';
import * as ToastHelpers from '@/lib/toastHelpers';

// Mock dependencies
vi.mock('@/context/CustomizationContext', () => ({
    useCustomization: vi.fn(),
}));

vi.mock('@/context/CustomerAuthContext', () => ({
    useCustomerAuth: vi.fn(),
}));

vi.mock('@/lib/savedDesignsStorage', () => ({
    getSavedDesigns: vi.fn(),
    saveDesign: vi.fn(),
    deleteDesign: vi.fn(),
    getDesignsByProduct: vi.fn(),
}));

vi.mock('@/lib/toastHelpers', () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
}));

// Mock simple usage
const mockUseCustomization = CustomizationContext.useCustomization as any;
const mockUseCustomerAuth = CustomerAuthContext.useCustomerAuth as any;
const mockStorage = SavedDesignsStorage as any;

describe('useCustomizationDrafts', () => {
    const mockProduct = { _id: 'prod1', name: 'Shirt', category: 'shirt', images: { baseImage: 'base.png' } };
    const mockCaptureScreenshot = vi.fn().mockResolvedValue('screenshot.png');
    const mockSetters = {
        setFabric: vi.fn(),
        setCollar: vi.fn(),
        setCuff: vi.fn(),
        updateMeasurements: vi.fn(),
        setStyle: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Default Context Values
        mockUseCustomization.mockReturnValue({
            config: {
                fabric: { id: 'fab1', name: 'Fab 1', image: 'fab.png' },
                styles: { collar: { id: 'c1' } },
                measurements: { neck: 15 }
            },
            ...mockSetters,
            isShirt: true
        });

        mockUseCustomerAuth.mockReturnValue({
            customer: null,
            isAuthenticated: false,
            saveDesign: vi.fn(),
            deleteDesign: vi.fn(),
        });

        mockStorage.getSavedDesigns.mockReturnValue([]);
        mockStorage.getDesignsByProduct.mockReturnValue([]);
    });

    it('should load saved designs safely', () => {
        mockStorage.getSavedDesigns.mockReturnValue([
            { id: 'd1', productId: 'prod1', savedAt: new Date().toISOString() }
        ]);

        const { result } = renderHook(() => useCustomizationDrafts({
            product: mockProduct,
            captureScreenshot: mockCaptureScreenshot,
            totalPrice: 100
        }));

        expect(result.current.savedDesigns).toHaveLength(1);
        expect(result.current.savedDesigns[0].id).toBe('d1');
    });

    it('should save a draft to local storage if not authenticated', async () => {
        const { result } = renderHook(() => useCustomizationDrafts({
            product: mockProduct,
            captureScreenshot: mockCaptureScreenshot,
            totalPrice: 100
        }));

        await act(async () => {
            await result.current.saveDraft();
        });

        expect(mockCaptureScreenshot).toHaveBeenCalled();
        expect(mockStorage.saveDesign).toHaveBeenCalledWith(expect.objectContaining({
            productId: 'prod1',
            totalPrice: 100,
            screenshot: 'screenshot.png'
        }));
        expect(ToastHelpers.showSuccess).toHaveBeenCalled();
    });

    it('should save a draft to account if authenticated', async () => {
        const mockSaveRemote = vi.fn().mockResolvedValue({ success: true });
        mockUseCustomerAuth.mockReturnValue({
            customer: { _id: 'u1' },
            isAuthenticated: true,
            saveDesign: mockSaveRemote,
        });

        const { result } = renderHook(() => useCustomizationDrafts({
            product: mockProduct,
            captureScreenshot: mockCaptureScreenshot,
            totalPrice: 100
        }));

        await act(async () => {
            await result.current.saveDraft();
        });

        expect(mockSaveRemote).toHaveBeenCalledWith(expect.objectContaining({
            productId: 'prod1',
            screenshot: 'screenshot.png'
        }));
        expect(mockStorage.saveDesign).not.toHaveBeenCalled();
        expect(ToastHelpers.showSuccess).toHaveBeenCalledWith('Design saved to your account!');
    });

    it('should restore a draft', () => {
        const { result } = renderHook(() => useCustomizationDrafts({
            product: mockProduct,
            captureScreenshot: mockCaptureScreenshot,
            totalPrice: 100
        }));

        const draft = {
            config: {
                fabric: { id: 'fab2' },
                collar: { id: 'c2' },
                styles: { cuff: { id: 'cf2' } },
                measurements: { neck: 16 }
            }
        };

        act(() => {
            result.current.restoreDraft(draft);
        });

        expect(mockSetters.setFabric).toHaveBeenCalledWith(draft.config.fabric);
        expect(mockSetters.setCollar).toHaveBeenCalledWith(draft.config.collar);
        expect(mockSetters.setStyle).toHaveBeenCalledWith('cuff', draft.config.styles.cuff);
        expect(mockSetters.updateMeasurements).toHaveBeenCalledWith(draft.config.measurements);
        expect(ToastHelpers.showSuccess).toHaveBeenCalledWith('Design restored!');
    });

    it('should delete a draft', async () => {
        mockStorage.getDesignsByProduct.mockReturnValue([]);
        mockStorage.deleteDesign.mockReturnValue([{ id: 'd2', productId: 'prod1' }]); // items remaining

        const { result } = renderHook(() => useCustomizationDrafts({
            product: mockProduct,
            captureScreenshot: mockCaptureScreenshot,
            totalPrice: 100
        }));

        await act(async () => {
            await result.current.removeDraft('d1');
        });

        expect(mockStorage.deleteDesign).toHaveBeenCalledWith('d1');
        expect(ToastHelpers.showSuccess).toHaveBeenCalledWith('Design deleted');
    });
});
